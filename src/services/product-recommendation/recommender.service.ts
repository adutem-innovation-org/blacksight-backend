import { IBot } from "@/models";
import { logger } from "@/logging";
import { Pinecone } from "@pinecone-database/pinecone";
import { config } from "@/config";
import OpenAI from "openai";
import { Logger } from "winston";
import { logJsonError } from "@/helpers";

export class Recommender {
  private static instance: Recommender;

  // Helpers
  private static readonly logJsonError = logJsonError;
  private static readonly logger: Logger = logger;

  private readonly pinecone: Pinecone;
  private readonly openai: OpenAI;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: config.pinecone.apiKey,
      maxRetries: 5,
    });
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new Recommender();
    }
    return this.instance;
  }

  async extractProductRecommendations(
    bot: IBot,
    businessId: string,
    userQuery: string
  ): Promise<string> {
    try {
      // Check if bot has product sources configured
      const productSourceIds = (bot.productsSources || [])
        .map((ps) => ps.documentId.toString())
        .filter(Boolean);

      if (productSourceIds.length === 0) {
        Recommender.logger.info(
          `No product sources configured for bot ${bot._id}`
        );
        return "NO_PRODUCT_SOURCES_CONFIGURED";
      }

      Recommender.logger.info(
        `Querying product recommendations for bot ${bot._id} with ${productSourceIds.length} sources`
      );

      return await this.queryProductSources(
        businessId,
        productSourceIds,
        userQuery
      );
    } catch (error: any) {
      Recommender.logger.error("Unable to extract product recommendations");
      Recommender.logJsonError(error);
      return "PRODUCT_QUERY_ERROR";
    }
  }

  private async queryProductSources(
    businessId: string,
    productSourceIds: string[],
    userQuery: string
  ): Promise<string> {
    const pineconeIndex = this.pinecone.Index("product-source");

    try {
      // Create embedding for user query
      const embeddingResponse = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: userQuery,
      });

      const queryEmbedding = embeddingResponse.data[0].embedding;
      const embeddingTokens = embeddingResponse.usage.total_tokens;

      Recommender.logger.debug(
        `Created embedding for product query: ${userQuery.substring(0, 50)}...`
      );

      let readUnits = 0;

      // Query Pinecone for similar products
      const searchResults = await pineconeIndex.query({
        vector: queryEmbedding,
        topK: 5, // Get top 5 most relevant products
        includeMetadata: true,
        filter: {
          businessId,
          documentId: { $in: productSourceIds },
        },
      });

      readUnits = searchResults.usage?.readUnits ?? 1;

      Recommender.logger.debug(
        `Product search returned ${searchResults.matches.length} results`
      );

      // Log search results for debugging
      searchResults.matches.forEach((match, index) => {
        Recommender.logger.debug(
          `Product match ${index + 1}: score=${match.score}, documentId=${
            match.metadata?.documentId
          }`
        );
      });

      if (searchResults.matches.length === 0) {
        Recommender.logger.info("No relevant products found for query");
        return "NO_RELEVANT_PRODUCTS_FOUND";
      }

      // Filter out matches with very low confidence scores (optional)
      const relevantMatches = searchResults.matches.filter(
        (match) => (match.score || 0) > 0.1 // Adjust threshold as needed
      );

      if (relevantMatches.length === 0) {
        Recommender.logger.info("No high-confidence product matches found");
        return "NO_RELEVANT_PRODUCTS_FOUND";
      }

      const productData = relevantMatches
        .map((match) => match?.metadata?.text || "")
        .filter((text) => text.toString().length > 0)
        .join("\n\n");

      Recommender.logger.info(
        `Retrieved ${relevantMatches.length} relevant product recommendations`
      );

      return productData;
    } catch (error: any) {
      Recommender.logger.error("Error querying product sources");
      Recommender.logJsonError(error);
      return "PRODUCT_QUERY_ERROR";
    }
  }

  /**
   * Helper method to validate product query before processing
   */
  private isValidProductQuery(userQuery: string): boolean {
    const minQueryLength = 3;
    const productKeywords = [
      "recommend",
      "best",
      "which",
      "what product",
      "what service",
      "which tool",
      "pricing",
      "best-selling",
      "popular",
      "suggest",
      "choose",
      "compare",
      "option",
      "plan",
      "package",
      "subscription",
      "price",
      "cost",
      "buy",
      "purchase",
      "product",
      "service",
    ];

    if (userQuery.length < minQueryLength) {
      return false;
    }

    const queryLower = userQuery.toLowerCase();
    return productKeywords.some((keyword) => queryLower.includes(keyword));
  }

  /**
   * Check if a query is likely to be asking for product recommendations
   */
  static isProductRecommendationQuery(userQuery: string): boolean {
    const productKeywords = [
      "recommend",
      "best",
      "which",
      "what product",
      "what service",
      "which tool",
      "pricing",
      "best-selling",
      "popular",
      "suggest",
      "choose",
      "compare",
      "option",
      "plan",
      "package",
      "subscription",
      "price",
      "cost",
      "buy",
      "purchase",
      "product",
      "service",
      "do you have",
      "do you offer",
      "what can",
      "help me find",
      "looking for",
      "need something",
      "suitable for",
    ];

    const queryLower = userQuery.toLowerCase();
    return productKeywords.some((keyword) => queryLower.includes(keyword));
  }
}
