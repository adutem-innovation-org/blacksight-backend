import { IsNotEmpty, IsNumber } from "class-validator";

export class CreateSettingsDto {
  @IsNotEmpty({ message: "Please provide cost per knowledge-base read unit" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 6 },
    { message: "Cost per knowledge-base read unit must be a number" }
  )
  costPerRU!: number;

  @IsNotEmpty({ message: "Please provide cost per token" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 5 },
    { message: "Cost per token must be a number" }
  )
  costPerToken!: number;

  @IsNotEmpty({ message: "Please provide cost per knowledge-base write unit" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 6 },
    { message: "Cost per knowledge-base write unit must be a number" }
  )
  costPerWU!: number;

  @IsNotEmpty({ message: "Please provide markup percent" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: "Markup percent must be a number" }
  )
  markUpPercent!: number;

  @IsNotEmpty({ message: "Please provide cost per storage" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: "Cost per storage must be a number" }
  )
  costPerStorageGB!: number;

  @IsNotEmpty({ message: "Please provide storage markup percent" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: "Storage markup percent must be a number" }
  )
  storageMarkUpPercent!: number;

  @IsNotEmpty({ message: "Please provide token conversion factor" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: "Token conversion factor must be a number" }
  )
  tokenConversionFactor!: number;
}
