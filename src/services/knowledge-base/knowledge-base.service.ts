import { AddKnowledgeBaseDto } from "@/decorators";
import { AuthData } from "@/interfaces";
import { logger } from "@/logging";
import { Bot, IBot, IKnowledgeBase, KnowledgeBase } from "@/models";
import { eventEmitter, PaginationService } from "@/utils";
import { Model, Types } from "mongoose";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import {
  isOwnerUser,
  isSuperAdmin,
  logJsonError,
  throwForbiddenError,
  throwNotFoundError,
  throwServerError,
  throwUnsupportedMediaTypeError,
} from "@/helpers";
import { Pinecone } from "@pinecone-database/pinecone";
import { config } from "@/config";
import OpenAI from "openai";
import { BotStatus, Events, UserTypes } from "@/enums";
import { Logger } from "winston";
import EventEmitter2 from "eventemitter2";

export class KnowledgeBaseService {
  private static instance: KnowledgeBaseService;
  static logger: Logger = logger;
  private static readonly logJsonError = logJsonError;
  static readonly eventEmitter: EventEmitter2 = eventEmitter;

  private readonly knowledgeBaseModel: Model<IKnowledgeBase> = KnowledgeBase;
  private readonly botModel: Model<IBot> = Bot;

  private readonly knowledgeBasePaginationService: PaginationService<IKnowledgeBase>;
  private readonly pinecone: Pinecone;
  private readonly openai: OpenAI;

  constructor() {
    this.knowledgeBasePaginationService = new PaginationService(
      this.knowledgeBaseModel
    );
    this.pinecone = new Pinecone({
      apiKey: config.pinecone.apiKey,
      maxRetries: 5,
    });
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
  }

  static getInstace() {
    if (!this.instance) {
      this.instance = new KnowledgeBaseService();
    }
    return this.instance;
  }

  async analytics(auth: AuthData) {
    let query: Record<string, any> = {};
    if (auth.userType === UserTypes.USER) {
      query = { businessId: new Types.ObjectId(auth.userId) };
    }
    const result = await Promise.allSettled([
      this.knowledgeBaseModel.countDocuments(query).exec(),
      this.knowledgeBaseModel
        .countDocuments({ isActive: true, ...query })
        .exec(),
    ]);

    return {
      data: {
        totalKnowledgeBases:
          result[0].status === "fulfilled" ? result[0].value : 0,
        activeKnowledgeBases:
          result[1].status === "fulfilled" ? result[1].value : 0,
      },
    };
  }

  async addKnowledgeBase(
    auth: AuthData,
    body: AddKnowledgeBaseDto,
    file: Express.Multer.File
  ) {
    try {
      const businessId = auth.userId;
      const documentId = new Types.ObjectId();
      let content = "";

      const ext = path.extname(file.originalname).toLowerCase();
      switch (ext) {
        case ".txt":
        case ".md":
          content = await fs.promises.readFile(file.path, "utf-8");
          break;
        case ".pdf":
          const file_data = await fs.promises.readFile(file.path);
          const data = await pdfParse(file_data);
          content = data.text;
          break;
        case ".docx":
          const result = await mammoth.extractRawText({ path: file.path });
          content = result.value;
          break;
        default:
          return throwUnsupportedMediaTypeError("Unsupported file type.");
      }

      const pineconeIndex = this.pinecone.Index("knowledge-base");

      // const chunks = content.match(/(.{1,500})/g);
      const chunks = content.match(/[^.!?]{1,500}[.!?]/g) || [];

      const chunkDocs = [];

      try {
        for (let i = 0; i < chunks?.length; i++) {
          const text = chunks[i];
          const embeddingResponse = await this.openai.embeddings.create({
            // model: "text-embedding-ada-002",
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

        const knowledgeBase = await this.knowledgeBaseModel.findOneAndUpdate(
          {
            businessId: new Types.ObjectId(businessId),
            documentId,
            tag: body.tag,
          },
          {
            $setOnInsert: { businessId, documentId },
            $push: { chunks: { $each: chunkDocs } },
          },
          {
            upsert: true,
            new: true, // return the updated (or inserted) document
            setDefaultsOnInsert: true, // optional: applies default values if inserting
            runValidators: true,
          }
        );

        return { knowledgeBase, message: "Knowledge base stored." };
      } catch (error: any) {
        console.log("Error >> ", error);
        return throwServerError(
          error?.message || error || "An unknown error has occurred"
        );
      }
    } finally {
      KnowledgeBaseService.logger.info(
        "Cleaning up uploaded knowledge base file."
      );
      try {
        await fs.promises.unlink(file.path);
      } catch (err: any) {
        console.warn("File deletion failed or already removed:", err.message);
      }
    }
  }

  queryKnowledgeBase = async (
    businessId: string,
    documentId: string,
    userQuery: string
  ) => {
    const pineconeIndex = this.pinecone.Index("knowledge-base");

    const embeddingResponse = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userQuery,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    const searchResults = await pineconeIndex.query({
      vector: queryEmbedding,
      topK: 3,
      includeMetadata: true,
      filter: {
        businessId,
        documentId,
      },
    });

    return searchResults.matches
      .map((match) => match?.metadata?.text || "")
      .join("\n\n");
  };

  async getAllKnowledgeBase(auth: AuthData) {
    let query: Record<string, any> = {};
    if (auth.userType === UserTypes.USER) {
      query.businessId = new Types.ObjectId(auth.userId);
    }
    return await this.knowledgeBasePaginationService.paginate({ query }, []);
  }

  async getKnowledgeBaseById(auth: AuthData, id: string) {
    const knowledgeBase = await this.knowledgeBaseModel.findById(id);
    if (!knowledgeBase) return throwNotFoundError("Knowledge base not found");
    if (
      auth.userType === UserTypes.USER &&
      knowledgeBase.businessId.toString() !== auth.userId.toString()
    )
      return throwForbiddenError("You are not allowed to access this resource");
    return { knowledgeBase };
  }

  async deleteKnowledgeBase(auth: AuthData, id: string) {
    const businessId = auth.userId;

    // Delete from mongodb
    const knowledgeBase = await this.knowledgeBaseModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      businessId,
    });

    // Check for resource existence (This will fail if: The knowledge base doesn't exist or the current entity is not the owner of the resource.)
    if (!knowledgeBase) return throwNotFoundError("Knowledge base not found");

    // Index pinecone
    const pineconeIndex = this.pinecone.Index("knowledge-base");

    // // Delete from pinecone
    // await pineconeIndex.deleteMany([
    //   { id: `${businessId}-${knowledgeBase.documentId}-*` },
    // ]);
    // Build exact chunk IDs from the document
    const documentId = knowledgeBase.documentId.toString();
    const idsToDelete = knowledgeBase.chunks.map(
      (chunk: any) => `${businessId}-${documentId}-${chunk.chunkId}`
    );
    console.log(idsToDelete);

    // Delete from Pinecone
    await pineconeIndex.deleteMany(idsToDelete);

    return { message: "Knowledge base deleted.", knowledgeBase };
  }

  async activateKB(auth: AuthData, id: string) {
    const kb = await this.setKbStatus(auth, id, true);
    return { knowledgeBase: kb, message: "Knowledgebase activated" };
  }

  async deactivateKB(auth: AuthData, id: string) {
    const kb = await this.setKbStatus(auth, id, false);

    // Deactivate any bot connected to this knowledge base
    /**
     * @deprecated
     * @description This approach has been deprecated because deactivating bot with inactive knowledge base is a key operation
     */
    // KnowledgeBaseService.eventEmitter.emit(Events.DEACTIVATE_BOTS_BY_KB_ID, {
    //   auth,
    //   knowledgeBaseId: id,
    // });
    await this.deactivateBotsByKbId(auth, id);

    return { knowledgeBase: kb, message: "Knolwedgebase deactivated" };
  }

  async setKbStatus(auth: AuthData, id: string, status: boolean) {
    const kb = await this.knowledgeBaseModel.findById(id);
    if (!kb) return throwNotFoundError("Knowledgebase not found");
    if (!isOwnerUser(auth, kb.businessId) && !isSuperAdmin(auth))
      return throwForbiddenError("You are not allowed to access this resource");

    kb.isActive = status;
    await kb.save();

    return kb;
  }

  async deactivateBotsByKbId(auth: AuthData, knowledgeBaseId: string) {
    try {
      const allAssociatedBots = await this.botModel.find({
        knowledgeBaseId: new Types.ObjectId(knowledgeBaseId),
      });

      if (allAssociatedBots.length === 0) return;

      const botDeactivationPromises = allAssociatedBots
        .filter(
          (bot) => isOwnerUser(auth, bot.businessId) || isSuperAdmin(auth)
        )
        .map(async (bot) => {
          bot.status = BotStatus.INACTIVE;
          bot.isActive = false;
          await bot.save();
        });

      await Promise.allSettled(botDeactivationPromises);
    } catch (error) {
      KnowledgeBaseService.logJsonError(error);
    }
  }
}
