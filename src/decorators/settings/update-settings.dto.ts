import { IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class UpdateSettingsDto {
  @IsOptional()
  @IsNotEmpty({ message: "Please provide cost per knowledge-base read unit" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "Cost per knowledge-base read unit must be a number" }
  )
  costPerRU?: number;

  @IsOptional()
  @IsNotEmpty({ message: "Please provide cost per token" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "Cost per token must be a number" }
  )
  costPerToken?: number;

  @IsOptional()
  @IsNotEmpty({ message: "Please provide cost per knowledge-base write unit" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "Cost per knowledge-base write unit must be a number" }
  )
  costPerWU?: number;

  @IsOptional()
  @IsNotEmpty({ message: "Please provide markup percent" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "Markup percent must be a number" }
  )
  markUpPercent?: number;

  @IsOptional()
  @IsNotEmpty({ message: "Please provide cost per storage" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "Cost per storage must be a number" }
  )
  costPerStorageGB?: number;

  @IsOptional()
  @IsNotEmpty({ message: "Please provide storage markup percent" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "Storage markup percent must be a number" }
  )
  storageMarkUpPercent?: number;

  @IsOptional()
  @IsNotEmpty({ message: "Please provide token conversion factor" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "Token conversion factor must be a number" }
  )
  tokenConversionFactor?: number;

  @IsOptional()
  @IsNotEmpty({ message: "Please provide cost per prompt token" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "Cost per prompt token must be a number" }
  )
  costPerPromptToken?: number;

  @IsOptional()
  @IsNotEmpty({ message: "Please provide cost per cached prompt token" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "Cost per cached prompt token must be a number" }
  )
  costPerCachedPromptToken?: number;

  @IsOptional()
  @IsNotEmpty({ message: "Please provide cost per completion token" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "Cost per completion token must be a number" }
  )
  costPerCompletionToken?: number;

  @IsOptional()
  @IsNotEmpty({ message: "Please provide chat completion markup percent" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "Chat completion markup percent must be a number" }
  )
  chatCompletionMarkUpPercent?: number;

  @IsOptional()
  @IsNotEmpty({ message: "Please provide cost per embedding token" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "Cost per embedding token must be a number" }
  )
  costPerEmbeddingToken?: number;

  @IsOptional()
  @IsNotEmpty({ message: "Please provide embeddings markup percent" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "Embeddings markup percent must be a number" }
  )
  embeddingsMarkUpPercent?: number;

  @IsOptional()
  @IsNotEmpty({ message: "Please provide cost per transcription minute" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "Cost per transcription minute must be a number" }
  )
  costPerTranscriptionMinute?: number;

  @IsOptional()
  @IsNotEmpty({ message: "Please provide transcription markup percent" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "Transcription markup percent must be a number" }
  )
  transcriptionMarkUpPercent?: number;
}
