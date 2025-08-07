import { config } from "@/config";
import {
  ApiProdutsUpdateInterval,
  Events,
  KnowledgeBaseSources,
  UserTypes,
} from "@/enums";
import {
  logJsonError,
  throwNotFoundError,
  throwServerError,
  throwUnprocessableEntityError,
} from "@/helpers";
import { AuthData } from "@/interfaces";
import { logger } from "@/logging";
import { IBot, IProductSource, ProductSource } from "@/models";
import { eventEmitter, PaginationService } from "@/utils";
import { Pinecone } from "@pinecone-database/pinecone";
import EventEmitter2 from "eventemitter2";
import { Types } from "mongoose";
import { Model } from "mongoose";
import OpenAI from "openai";
import { Logger } from "winston";
import { BotSharedService } from "../bot";
import { AddProductsSourceDto } from "@/decorators";
import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import csvParser from "csv-parser";

export class ProductRecommendationService {
  private static instance: ProductRecommendationService;

  private static readonly logJsonError = logJsonError;
  private static readonly logger: Logger = logger;
  private static eventEmitter: EventEmitter2 = eventEmitter;

  private readonly productSourceModel: Model<IProductSource> = ProductSource;

  private readonly productSourcePagination: PaginationService<IProductSource>;
  private readonly botSharedService: BotSharedService;
  private readonly pinecone: Pinecone;
  private readonly openai: OpenAI;

  constructor() {
    this.productSourcePagination = new PaginationService(
      this.productSourceModel
    );
    this.botSharedService = BotSharedService.getInstance();
    this.pinecone = new Pinecone({
      apiKey: config.pinecone.apiKey,
      maxRetries: 5,
    });
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
  }

  static getInstance(): ProductRecommendationService {
    if (!this.instance) {
      this.instance = new ProductRecommendationService();
    }
    return this.instance;
  }

  private async cleanUpPinecone(
    documentId: string | Types.ObjectId,
    businessId: string | Types.ObjectId,
    totalChunks: number
  ) {
    if (totalChunks === 0) return;
    const pineconeIndex = this.pinecone.Index("product-source");
    try {
      // Delete from Pinecone
      const idsToDelete = Array.from(
        { length: totalChunks },
        (_, i) => `${businessId}-${documentId}-${i}`
      );
      await pineconeIndex.deleteMany(idsToDelete);
    } catch (error) {
      ProductRecommendationService.logger.error(
        "Unable to delete from Pinecone"
      );
      ProductRecommendationService.logJsonError(error);
    }
  }

  private formatFileSize(size: number) {
    const kilobyte = 1024;
    const megabyte = kilobyte * 1024;
    const gigabyte = megabyte * 1024;
    if (size < kilobyte) return `${size} bytes`;
    else if (size < megabyte) return `${(size / kilobyte).toFixed(2)} KB`;
    else if (size < gigabyte) return `${(size / megabyte).toFixed(2)} MB`;
    else return `${(size / gigabyte).toFixed(2)} GB`;
  }

  private async parseFileContent(file: Express.Multer.File): Promise<string> {
    let content = "";
    const ext = path.extname(file.originalname).toLowerCase();

    switch (ext) {
      case ".txt":
        content = await fs.promises.readFile(file.path, "utf-8");
        break;
      case ".xlsx":
      case ".xls":
        try {
          // Read the Excel file
          const workbook = XLSX.readFile(file.path);
          const sheetName = workbook.SheetNames[0]; // Get first sheet
          const worksheet = workbook.Sheets[sheetName];

          // Convert to JSON array (each row as an object)
          const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, {
            header: 1,
          });

          // Convert each row to a string and join with newlines
          const lines = jsonData.map(
            (row: any[]) => row.map((cell) => cell?.toString() || "").join("\t") // Join cells with tabs
          );

          content = lines.join("\n");
        } catch (error: any) {
          throw new Error(`Error parsing Excel file: ${error.message}`);
        }
        break;

      case ".csv":
        try {
          const rows: string[][] = [];

          // Create a readable stream and parse CSV
          const stream = fs
            .createReadStream(file.path)
            .pipe(csvParser({ headers: false })); // headers: false to get raw arrays

          // Collect all rows
          for await (const row of stream) {
            // csv-parser returns objects, convert to array of values
            const rowArray = Object.values(row) as string[];
            rows.push(rowArray);
          }

          // Convert each row to a string and join with newlines
          const lines = rows.map(
            (row: string[]) => row.join("\t") // Join cells with tabs
          );

          content = lines.join("\n");
        } catch (error: any) {
          throw new Error(`Error parsing CSV file: ${error.message}`);
        }
        break;

      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }

    return content;
  }

  async addProductsSource(
    auth: AuthData,
    body: AddProductsSourceDto,
    file: Express.Multer.File
  ) {
    const businessId = auth.userId;
    const documentId = new Types.ObjectId();
    let totalChunks = 0;

    try {
      let content = "";

      switch (body.source) {
        case KnowledgeBaseSources.FILE:
          content = await this.parseFileContent(file);
          break;
        case KnowledgeBaseSources.TEXT_INPUT:
          content = body.text ?? "";
          break;
        case KnowledgeBaseSources.API:
          throwUnprocessableEntityError("Coming soon");
          break;
        default:
          return throwUnprocessableEntityError(
            "This source is either invalid or not supported at the moment."
          );
      }

      const pineconeIndex = this.pinecone.Index("product-source");

      // const chunks = content.match(/(.{1,500})/g);
      const chunks = content.match(/[^.!?]{1,500}[.!?]/g) || [];

      const chunkDocs = [];

      if (chunks.length === 0)
        throwUnprocessableEntityError("Empty or very small file uploaded.");

      // Used for cleanup during failure case
      totalChunks = chunks.length;

      try {
        for (let i = 0; i < chunks?.length; i++) {
          const text = chunks[i];
          const embeddingResponse = await this.openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text,
          });

          const embedding = embeddingResponse.data[0].embedding;

          chunkDocs.push({ chunkId: i, text });

          await pineconeIndex.upsert([
            {
              id: `${businessId}-${documentId}-${i}`,
              values: embedding,
              metadata: {
                businessId,
                documentId: documentId.toString(),
                chunkId: i,
                text,
              },
            },
          ]);
        }

        const productsSource = await this.productSourceModel.findOneAndUpdate(
          {
            businessId: new Types.ObjectId(businessId),
            documentId,
            tag: body.tag,
          },
          {
            $setOnInsert: {
              businessId,
              documentId,
              source: body.source,
              metaData: {
                name:
                  body.source === KnowledgeBaseSources.FILE
                    ? file.originalname
                    : body.tag,
                size:
                  body.source === KnowledgeBaseSources.FILE
                    ? this.formatFileSize(file.size)
                    : body.source === KnowledgeBaseSources.TEXT_INPUT
                    ? this.formatFileSize(Buffer.byteLength(content, "utf-8"))
                    : undefined,
                apiUrl:
                  body.source === KnowledgeBaseSources.API
                    ? body.apiUrl
                    : undefined,
                authMethod:
                  body.source === KnowledgeBaseSources.API
                    ? body.authMethod
                    : undefined,
                apiKey:
                  body.source === KnowledgeBaseSources.API
                    ? body?.apiKey
                    : undefined,
                bearerToken:
                  body.source === KnowledgeBaseSources.API
                    ? body?.bearerToken
                    : undefined,
                username:
                  body.source === KnowledgeBaseSources.API
                    ? body?.username
                    : undefined,
                password:
                  body.source === KnowledgeBaseSources.API
                    ? body?.password
                    : undefined,
                updateInverval:
                  body.source === KnowledgeBaseSources.API
                    ? body?.updateInterval || ApiProdutsUpdateInterval.NEVER
                    : undefined,
              },
            },
            $push: { chunks: { $each: chunkDocs } },
          },
          {
            upsert: true,
            new: true, // return the updated (or inserted) document
            setDefaultsOnInsert: true, // optional: applies default values if inserting
            runValidators: true,
          }
        );

        return { productsSource, message: "Knowledge base stored." };
      } catch (error: any) {
        console.log("Error >> ", error);
        return throwServerError(
          error?.message || error || "An unknown error has occurred"
        );
      }
    } catch (error: any) {
      ProductRecommendationService.logger.error(
        "Unable to add products source."
      );
      ProductRecommendationService.logger.info(
        "Attempting to clean up pinecone"
      );
      this.cleanUpPinecone(documentId, businessId, totalChunks);
      return throwUnprocessableEntityError(error?.message || error);
    } finally {
      ProductRecommendationService.logger.info(
        "Cleaning up uploaded products source file."
      );
      try {
        if (body.source === KnowledgeBaseSources.FILE && file) {
          await fs.promises.unlink(file.path);
        }
      } catch (err: any) {
        console.warn("File deletion failed or already removed:", err.message);
      }
    }
  }

  private async _extractProductsSourcesId(bot: IBot) {
    return (bot.productsSources || [])
      .map((source) => source.documentId.toString())
      .filter(Boolean);
  }

  private async _readProductsSources(
    businessId: string,
    documentIds: string[],
    userQuery: string
  ) {
    const pineconeIndex = this.pinecone.Index("product-source");

    const embeddingResponse = await this.openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: userQuery,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    const embeddingTokens = embeddingResponse.usage.total_tokens;

    let readUnits = 0;

    try {
      const searchResults = await pineconeIndex.query({
        vector: queryEmbedding,
        topK: 5, // you can increase since results are now across multiple docs
        includeMetadata: true,
        filter: {
          businessId,
          documentId: { $in: documentIds },
        },
      });

      readUnits = searchResults.usage?.readUnits ?? 1;

      return searchResults.matches
        .map((match) => match?.metadata?.text || "")
        .join("\n\n");
    } catch (error) {
      return "";
    } finally {
      // Charge for knwoledge base read operation
      ProductRecommendationService.eventEmitter.emit(
        Events.CHARGE_READ_KNOWLEDGE_BASE,
        {
          embeddingTokens,
          readUnits,
        }
      );
    }
  }

  async queryProductsSources(bot: IBot, userQuery: string) {
    const businessId = bot.businessId.toString();
    const documentIds = await this._extractProductsSourcesId(bot);
    return await this._readProductsSources(businessId, documentIds, userQuery);
  }

  async getAllProductsSources(auth: AuthData) {
    let query: Record<string, any> = {};
    // const populate = ["connectedBots", "createdBy"];
    if (auth.userType === UserTypes.USER) {
      query.businessId = new Types.ObjectId(auth.userId);
    }
    return await this.productSourcePagination.paginate(
      { query, projections: { chunks: 0 }, sort: { updatedAt: -1 } },
      []
    );
  }

  async deleteProductsSource(auth: AuthData, id: string) {
    const businessId = auth.userId;

    // Delete from mongodb
    const productsSource = await this.productSourceModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      businessId,
    });

    // Check for resource existence (This will fail if: The product source doesn't exist or the current entity is not the owner of the resource.)
    if (!productsSource) return throwNotFoundError("Knowledge base not found");

    // Index pinecone
    const pineconeIndex = this.pinecone.Index("product-source");

    // Build exact chunk IDs from the document
    const documentId = productsSource.documentId.toString();
    const idsToDelete = productsSource.chunks.map(
      (chunk: any) => `${businessId}-${documentId}-${chunk.chunkId}`
    );

    if (idsToDelete.length > 0) {
      try {
        // Delete from Pinecone
        await pineconeIndex.deleteMany(idsToDelete);
      } catch (error) {
        ProductRecommendationService.logger.error(
          "Unable to delete from Pinecone"
        );
        ProductRecommendationService.logJsonError(error);
      }
    }

    // Remove this product source from all bots
    await this.botSharedService.disconnectProductsSource(auth, id);

    return { message: "Knowledge base deleted.", productsSource };
  }
}
