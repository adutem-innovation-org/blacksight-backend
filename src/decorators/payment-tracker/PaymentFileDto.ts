import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import "reflect-metadata";

export class CreatePaymentFileDto {
  @IsOptional()
  @IsString({ message: "Payment file tag must be of type string" })
  readonly tag?: string;

  // This will be populated by middleware after file parsing
  paymentRecords?: any[];
}

export class UpdatePaymentFileDto {
  @IsOptional()
  @IsString({ message: "Payment file tag must be of type string" })
  readonly tag?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readonly insertNew?: boolean;

  // This will be populated by middleware after file parsing
  paymentRecords?: any[];
}
