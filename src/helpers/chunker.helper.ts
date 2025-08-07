type ChunkerOptions = {
  maxChunkSize: number;
  minChunkSize: number;
  overlap: number;
  targetChunkSize: number;
  preserveContext: boolean;
  smartBoundaries: boolean;
};

type Patterns = {
  product: RegExp;
  service: RegExp;
  policy: RegExp;
  faq: RegExp;
  contact: RegExp;
  about: RegExp;
  structured: RegExp;
  list: RegExp;
  heading: RegExp;
};

enum Strategy {
  single = "single",
  structured_semantic = "structured_semantic",
  qa_pairs = "qa_pairs",
  hierarchical = "hierarchical",
  list_aware = "list_aware",
  paragraph_semantic = "paragraph_semantic",
  sentence_aware = "sentence_aware",
}

type Analysis = {
  length: number;
  word_count: number;
  line_count: number;
  avg_line_length: number;
  content_types: string[];
  structure: {
    has_headings: boolean;
    has_lists: boolean;
    has_structured_data: boolean;
    has_paragraphs: boolean;
    paragraph_count: number;
  };
  business_context: {
    domain: string;
    content_category: string;
    priority: string;
  };
};

type ChunkType = {
  text: string;
  size: number;
  type: ContentType;
  heading?: string;
  level?: number;
  part?: number;
  total_parts?: number;
  content_summary?: string;
};

type MetaData = {
  business_domain: string;
  content_category: string;
  priority: string;
};

type Section = {
  text: string;
  heading: string | null;
  level: number;
};

enum ContentType {
  entity_group = "entity_group",
  entity_core = "entity_core",
  entity_details = "entity_details",
  qa_group = "qa_group",
  section = "section",
  list_group = "list_group",
  list_core = "list_core",
  list_details = "list_details",
  paragraph_group = "paragraph_group",
}

type ResultType = {
  chunks: ChunkType[];
  average_size: number;
  strategy: Strategy;
  analysis: Analysis;
  total_chunks: number;
};

export class UniversalBusinessChunker {
  options: ChunkerOptions;
  patterns: Patterns;
  private static instance: UniversalBusinessChunker;

  constructor(options: Partial<ChunkerOptions>) {
    this.options = {
      maxChunkSize: options.maxChunkSize || 1200,
      minChunkSize: options.minChunkSize || 100,
      overlap: options.overlap || 100,
      targetChunkSize: options.targetChunkSize || 800,
      preserveContext: options.preserveContext !== false,
      smartBoundaries: options.smartBoundaries !== false,
      ...options,
    };

    // Content type patterns for detection
    this.patterns = {
      product:
        /(?:name|title|product|item):\s*[^\n]+[\s\S]*?(?:price|cost):\s*[^\n]+/i,
      service:
        /(?:service|offering|package):\s*[^\n]+[\s\S]*?(?:price|cost|rate):\s*[^\n]+/i,
      policy:
        /(?:policy|procedure|guideline|rule|regulation)[\s\S]*?(?:effective|applies|requirements)/i,
      faq: /(?:q:|question:|frequently asked|faq)[\s\S]*?(?:a:|answer:)/i,
      contact: /(?:contact|address|phone|email|location|hours|office)/i,
      about:
        /(?:about|mission|vision|history|founded|established|company|organization)/i,
      structured: /^[A-Za-z][^:\n]*:\s*[^\n]+(?:\n[A-Za-z][^:\n]*:\s*[^\n]+)+/m,
      list: /^[\s]*[-*•]\s|^\s*\d+\.\s|^\s*[a-zA-Z]\.\s/m,
      heading: /^#+\s|^[A-Z\s]+$|^[A-Za-z\s]+\n[=-]+$/m,
    };
  }

  static getInstance(options: Partial<ChunkerOptions> = {}) {
    if (!UniversalBusinessChunker.instance) {
      UniversalBusinessChunker.instance = new UniversalBusinessChunker(options);
    }
    return UniversalBusinessChunker.instance;
  }

  // Main chunking method
  chunkContent(content: string, metadata: Partial<MetaData> = {}) {
    if (!content || content.trim().length === 0) {
      throw new Error("Content cannot be empty");
    }

    // Clean and normalize content
    const cleanContent = this.cleanContent(content);

    // Analyze content structure
    const analysis = this.analyzeContent(cleanContent, metadata);

    // Choose chunking strategy based on analysis
    const strategy = this.selectStrategy(analysis) as Strategy;

    // Apply chunking strategy
    const chunks = this.applyStrategy(
      cleanContent,
      strategy,
      analysis
    ) as ChunkType[];

    // Post-process and validate
    const processedChunks = this.postProcess(chunks, analysis, metadata);

    return {
      chunks: processedChunks,
      analysis: analysis,
      strategy: strategy,
      total_chunks: processedChunks.length,
      average_size:
        processedChunks.reduce((sum: number, c: ChunkType) => sum + c.size, 0) /
        processedChunks.length,
    } as ResultType;
  }

  // Clean and normalize content
  cleanContent(content: string) {
    return (
      content
        // Normalize line endings
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        // Remove excessive whitespace but preserve structure
        .replace(/[ \t]+/g, " ")
        // Normalize multiple newlines but keep paragraph breaks
        .replace(/\n{3,}/g, "\n\n")
        // Clean up trailing whitespace
        .replace(/[ \t]+$/gm, "")
        .trim()
    );
  }

  // Comprehensive content analysis
  analyzeContent(content: string, metadata: Partial<MetaData> = {}) {
    const lines = content.split("\n");
    const words = content.split(/\s+/).length;
    const chars = content.length;

    const analysis: Analysis = {
      length: chars,
      word_count: words,
      line_count: lines.length,
      avg_line_length: chars / lines.length,
      content_types: [],
      structure: {
        has_headings: false,
        has_lists: false,
        has_structured_data: false,
        has_paragraphs: false,
        paragraph_count: 0,
      },
      business_context: {
        domain: metadata.business_domain || "general",
        content_category: metadata.content_category || "unknown",
        priority: metadata.priority || "normal",
      },
    };

    // Detect content types
    Object.entries(this.patterns).forEach(([type, pattern]) => {
      if (pattern.test(content)) {
        analysis.content_types.push(type);
      }
    });

    // Analyze structure
    analysis.structure.has_headings = /^#+\s|^[A-Z\s]+$|^.+\n[=-]+$/m.test(
      content
    );
    analysis.structure.has_lists = /^[\s]*[-*•]\s|^\s*\d+\.\s/m.test(content);
    analysis.structure.has_structured_data = /^[^:\n]+:\s*[^\n]+$/m.test(
      content
    );

    // Count paragraphs (blocks of text separated by double newlines)
    const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim());
    analysis.structure.has_paragraphs = paragraphs.length > 1;
    analysis.structure.paragraph_count = paragraphs.length;

    return analysis;
  }

  // Select optimal chunking strategy
  selectStrategy(analysis: Analysis) {
    // If content is small enough, keep as single chunk
    if (analysis.length <= this.options.targetChunkSize) {
      return "single";
    }

    // For structured business data (products, services, policies)
    if (
      analysis.content_types.some((type) =>
        ["product", "service", "policy"].includes(type)
      )
    ) {
      return "structured_semantic";
    }

    // For FAQ content
    if (analysis.content_types.includes("faq")) {
      return "qa_pairs";
    }

    // For content with clear headings
    if (analysis.structure.has_headings) {
      return "hierarchical";
    }

    // For list-heavy content
    if (analysis.structure.has_lists && analysis.line_count > 20) {
      return "list_aware";
    }

    // For paragraph-based content
    if (
      analysis.structure.has_paragraphs &&
      analysis.structure.paragraph_count > 3
    ) {
      return "paragraph_semantic";
    }

    // Default to sentence-aware chunking
    return "sentence_aware";
  }

  // Apply selected chunking strategy
  applyStrategy(content: string, strategy: Strategy, analysis: Analysis) {
    switch (strategy) {
      case "single":
        return [{ text: content, type: "complete_document" }];

      case "structured_semantic":
        return this.chunkStructuredSemantic(content, analysis);

      case "qa_pairs":
        return this.chunkQAPairs(content);

      case "hierarchical":
        return this.chunkHierarchical(content);

      case "list_aware":
        return this.chunkListAware(content);

      case "paragraph_semantic":
        return this.chunkParagraphSemantic(content);

      case "sentence_aware":
        return this.chunkSentenceAware(content);

      default:
        return this.chunkSentenceAware(content);
    }
  }

  // Structured semantic chunking (for products, services, etc.)
  chunkStructuredSemantic(content: string, analysis: Analysis) {
    const chunks = [];

    // Split by clear entity boundaries
    const entityPattern =
      /(?=(?:name|title|product|service|policy|item):\s*[^\n]+)/gi;
    const entities = content.split(entityPattern).filter((e) => e.trim());

    if (entities.length <= 1) {
      return this.chunkParagraphSemantic(content);
    }

    let currentChunk = "";

    for (const entity of entities) {
      const entitySize = entity.length;

      // If single entity is too large, split it intelligently
      if (entitySize > this.options.maxChunkSize) {
        if (currentChunk) {
          chunks.push({ text: currentChunk.trim(), type: "entity_group" });
          currentChunk = "";
        }
        chunks.push(...this.splitLargeEntity(entity));
        continue;
      }

      // If adding entity would exceed limit, finalize current chunk
      if (currentChunk.length + entitySize > this.options.targetChunkSize) {
        if (currentChunk) {
          chunks.push({ text: currentChunk.trim(), type: "entity_group" });
        }
        currentChunk = entity;
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + entity;
      }
    }

    if (currentChunk.trim()) {
      chunks.push({ text: currentChunk.trim(), type: "entity_group" });
    }

    return chunks;
  }

  // Split large entities intelligently
  splitLargeEntity(entity: string) {
    const chunks = [];
    const lines = entity.split("\n").filter((l) => l.trim());

    // Try to identify key-value pairs or main content
    const keyLines = lines.filter((line) => /^[^:\n]+:\s*[^\n]+$/.test(line));
    const otherLines = lines.filter(
      (line) => !/^[^:\n]+:\s*[^\n]+$/.test(line)
    );

    if (keyLines.length > 0) {
      // Keep essential info together
      const essentialInfo = keyLines.slice(0, 3).join("\n"); // First 3 key-value pairs
      const remaining = [...keyLines.slice(3), ...otherLines].join("\n");

      chunks.push({ text: essentialInfo, type: "entity_core" });

      if (remaining.trim()) {
        if (remaining.length > this.options.maxChunkSize) {
          chunks.push(...this.chunkSentenceAware(remaining));
        } else {
          chunks.push({ text: remaining, type: "entity_details" });
        }
      }
    } else {
      // Fall back to sentence-aware splitting
      chunks.push(...this.chunkSentenceAware(entity));
    }

    return chunks;
  }

  // Q&A pair chunking
  chunkQAPairs(content: string) {
    const chunks = [];
    const qaPairs = content.split(/(?=q:|question:)/gi).filter((q) => q.trim());

    let currentChunk = "";

    for (const qa of qaPairs) {
      if (currentChunk.length + qa.length > this.options.targetChunkSize) {
        if (currentChunk) {
          chunks.push({ text: currentChunk.trim(), type: "qa_group" });
        }

        if (qa.length > this.options.maxChunkSize) {
          chunks.push(...this.chunkSentenceAware(qa));
        } else {
          currentChunk = qa;
        }
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + qa;
      }
    }

    if (currentChunk.trim()) {
      chunks.push({ text: currentChunk.trim(), type: "qa_group" });
    }

    return chunks;
  }

  // Hierarchical chunking (respects headings)
  chunkHierarchical(content: string) {
    const chunks = [];
    const sections = this.splitByHeadings(content);

    for (const section of sections) {
      if (section.text.length <= this.options.targetChunkSize) {
        chunks.push({
          text: section.text,
          type: "section",
          heading: section.heading,
          level: section.level,
        });
      } else {
        // Split large sections while preserving heading context
        const subChunks = this.chunkParagraphSemantic(section.text);
        subChunks.forEach((chunk, index) => {
          chunks.push({
            text:
              (index === 0 && section.heading ? section.heading + "\n\n" : "") +
              chunk.text,
            type: "section_part",
            heading: section.heading,
            level: section.level,
            part: index + 1,
            total_parts: subChunks.length,
          });
        });
      }
    }

    return chunks;
  }

  // Split content by headings
  splitByHeadings(content: string) {
    const sections = [];
    const lines = content.split("\n");
    let currentSection: Section = { text: "", heading: null, level: 0 };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = i + 1 < lines.length ? lines[i + 1] : "";

      // Check for markdown headings
      const markdownHeading = line.match(/^(#{1,6})\s+(.+)$/);
      // Check for underlined headings
      const underlineHeading = nextLine && /^[=-]{3,}$/.test(nextLine);

      if (markdownHeading) {
        if (currentSection.text.trim()) {
          sections.push({
            ...currentSection,
            text: currentSection.text.trim(),
          });
        }
        currentSection = {
          text: "",
          heading: markdownHeading[2],
          level: markdownHeading[1].length,
        };
      } else if (underlineHeading) {
        if (currentSection.text.trim()) {
          sections.push({
            ...currentSection,
            text: currentSection.text.trim(),
          });
        }
        currentSection = {
          text: "",
          heading: line,
          level: nextLine[0] === "=" ? 1 : 2,
        };
        i++; // Skip the underline
      } else {
        currentSection.text += line + "\n";
      }
    }

    if (currentSection.text.trim()) {
      sections.push({ ...currentSection, text: currentSection.text.trim() });
    }

    return sections;
  }

  // List-aware chunking
  chunkListAware(content: string) {
    const chunks = [];
    const sections = content.split(/\n\s*\n/);
    let currentChunk = "";

    for (const section of sections) {
      // If it's a list section, try to keep related items together
      if (/^[\s]*[-*•]\s|^\s*\d+\.\s/m.test(section)) {
        const items = section.split(/\n(?=[\s]*[-*•]\s|[\s]*\d+\.\s)/);

        for (const item of items) {
          if (
            currentChunk.length + item.length >
            this.options.targetChunkSize
          ) {
            if (currentChunk) {
              chunks.push({ text: currentChunk.trim(), type: "list_group" });
            }
            currentChunk = item;
          } else {
            currentChunk += (currentChunk ? "\n" : "") + item;
          }
        }
      } else {
        if (
          currentChunk.length + section.length >
          this.options.targetChunkSize
        ) {
          if (currentChunk) {
            chunks.push({ text: currentChunk.trim(), type: "mixed_content" });
          }
          currentChunk = section;
        } else {
          currentChunk += (currentChunk ? "\n\n" : "") + section;
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push({ text: currentChunk.trim(), type: "mixed_content" });
    }

    return chunks;
  }

  // Paragraph-aware semantic chunking
  chunkParagraphSemantic(content: string) {
    const chunks = [];
    const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim());
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      if (
        currentChunk.length + paragraph.length + 2 >
        this.options.targetChunkSize
      ) {
        if (currentChunk) {
          chunks.push({ text: currentChunk.trim(), type: "paragraph_group" });
          currentChunk = "";
        }

        // If paragraph is too long, split by sentences
        if (paragraph.length > this.options.maxChunkSize) {
          chunks.push(...this.chunkSentenceAware(paragraph));
        } else {
          currentChunk = paragraph;
        }
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      }
    }

    if (currentChunk.trim()) {
      chunks.push({ text: currentChunk.trim(), type: "paragraph_group" });
    }

    return chunks;
  }

  // Sentence-aware chunking (fallback method)
  chunkSentenceAware(content: string) {
    const chunks = [];
    const sentences = this.splitIntoSentences(content);
    let currentChunk = "";

    for (const sentence of sentences) {
      if (
        currentChunk.length + sentence.length >
        this.options.targetChunkSize
      ) {
        if (currentChunk) {
          chunks.push({ text: currentChunk.trim(), type: "sentence_group" });
          currentChunk = "";
        }

        // If single sentence is too long, force split by words
        if (sentence.length > this.options.maxChunkSize) {
          chunks.push(...this.forceWordSplit(sentence));
        } else {
          currentChunk = sentence;
        }
      } else {
        currentChunk += (currentChunk ? " " : "") + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push({ text: currentChunk.trim(), type: "sentence_group" });
    }

    return chunks;
  }

  // Split text into sentences
  splitIntoSentences(text: string) {
    // Enhanced sentence splitting that handles business content
    return text
      .split(/(?<=[.!?])\s+(?=[A-Z])|(?<=:)\s+(?=[A-Z])|(?<=\n)\s*(?=[A-Z])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  // Force split by words (last resort)
  forceWordSplit(text: string) {
    const chunks = [];
    const words = text.split(/\s+/);
    let currentChunk = "";

    for (const word of words) {
      if (currentChunk.length + word.length + 1 > this.options.maxChunkSize) {
        if (currentChunk) {
          chunks.push({ text: currentChunk.trim(), type: "word_group" });
        }
        currentChunk = word;
      } else {
        currentChunk += (currentChunk ? " " : "") + word;
      }
    }

    if (currentChunk.trim()) {
      chunks.push({ text: currentChunk.trim(), type: "word_group" });
    }

    return chunks;
  }

  // Post-process chunks
  postProcess(
    chunks: ChunkType[],
    analysis: Analysis,
    metadata: Partial<MetaData> = {}
  ) {
    return chunks
      .filter((chunk) => chunk.text.trim().length >= this.options.minChunkSize)
      .map((chunk, index) => ({
        id: `chunk_${Date.now()}_${index}`,
        text: chunk.text,
        type: chunk.type,
        size: chunk.text.length,
        word_count: chunk.text.split(/\s+/).length,
        index: index,
        total_chunks: chunks.length,

        // Content analysis
        content_summary: this.generateContentSummary(chunk.text, chunk.type),
        detected_types: analysis.content_types,
        business_domain: analysis.business_context.domain,
        content_category: analysis.business_context.content_category,

        // Additional metadata from specific chunk types
        ...(chunk.heading && {
          heading: chunk.heading,
          heading_level: chunk.level,
        }),
        ...(chunk.part && { part: chunk.part, total_parts: chunk.total_parts }),

        // Source metadata
        source_metadata: metadata,
        created_at: new Date().toISOString(),
        hash: this.generateHash(chunk.text),
      }));
  }

  // Generate content summary for better retrieval
  generateContentSummary(text: string, type: ContentType) {
    const firstLine = text.split("\n")[0];
    const preview = text.substring(0, 150);

    switch (type) {
      case "entity_group":
      case "entity_core":
        // Extract entity names/titles
        const entityMatch = text.match(
          /(?:name|title|product|service):\s*([^\n]+)/i
        );
        return entityMatch
          ? `Entity: ${entityMatch[1]}`
          : `Business entity information`;

      case "qa_group":
        const questionMatch = text.match(/(?:q:|question:)\s*([^\n?]+)/i);
        return questionMatch
          ? `Q&A: ${questionMatch[1]}`
          : "Question and answer content";

      case "section":
        return `Section: ${firstLine}`;

      case "list_group":
        return "List of items or procedures";

      case "paragraph_group":
        return preview.replace(/\n/g, " ") + (text.length > 150 ? "..." : "");

      default:
        return preview.replace(/\n/g, " ") + (text.length > 150 ? "..." : "");
    }
  }

  // Generate simple hash for deduplication
  generateHash(text: string) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // Validate final output
  validateOutput(result: ResultType) {
    const issues: string[] = [];

    result.chunks.forEach((chunk, index) => {
      if (chunk.size < this.options.minChunkSize) {
        issues.push(`Chunk ${index}: Too small (${chunk.size})`);
      }
      if (chunk.size > this.options.maxChunkSize) {
        issues.push(`Chunk ${index}: Too large (${chunk.size})`);
      }
      if (!chunk.text.trim()) {
        issues.push(`Chunk ${index}: Empty content`);
      }
    });

    return {
      valid: issues.length === 0,
      issues,
      stats: {
        total_chunks: result.chunks.length,
        total_size: result.chunks.reduce((sum, c) => sum + c.size, 0),
        average_size: result.average_size,
        strategy_used: result.strategy,
      },
    };
  }
}
