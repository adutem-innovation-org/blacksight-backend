import { logger } from "@/logging";
import { connect } from "mongoose";
import { config } from "@/config";
import { throwServerError } from "@/helpers";

export const establishDatabaseConnection = async (callback?: Function) => {
  try {
    logger.info("Connecting to the database...");
    if (!config.db.url) return throwServerError("Missing database url");
    await connect(config.db.url, {});
    logger.info("Connected to the database");
    if (callback) callback?.();
  } catch (error: any) {
    logger.error("An error occured during database connection");
    logger.error(error.message);
    process.exit(1);
  }
};
