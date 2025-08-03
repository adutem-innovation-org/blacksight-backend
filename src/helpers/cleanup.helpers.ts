import { CleanContentOptions } from "@/interfaces";
import { logger } from "@/logging";

export function cleanContent(
  raw: string,
  options: CleanContentOptions = {}
): string {
  try {
    const {
      maxLength = 100000,
      preserveNewlines = false,
      removeUrls = true,
    } = options;

    let cleaned = raw;

    // Remove URLs if requested
    if (removeUrls) {
      cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, "[URL removed]");
    }

    // Remove email addresses
    cleaned = cleaned.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      "[Email removed]"
    );

    // Clean whitespace
    cleaned = cleaned
      .replace(/\s{2,}/g, " ") // Collapse multiple spaces
      .replace(/\t+/g, " ") // Replace tabs with spaces
      .replace(/[ ]{2,}/g, " "); // Collapse spaces again

    if (!preserveNewlines) {
      cleaned = cleaned
        .replace(/\n{2,}/g, "\n") // Collapse multiple newlines
        .replace(/^\s*[\r\n]/gm, ""); // Remove empty lines
    }

    // Trim and truncate if necessary
    cleaned = cleaned.trim();

    if (cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength) + "...";
      logger.info("Content truncated during cleaning", {
        originalLength: raw.length,
        cleanedLength: cleaned.length,
        maxLength,
      });
    }

    return cleaned;
  } catch (error: any) {
    logger.error("Content cleaning failed", { error: error.message });
    throw new Error("Content cleaning failed");
  }
}
