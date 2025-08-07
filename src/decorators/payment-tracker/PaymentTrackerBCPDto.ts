import { PaymentInterval } from "@/enums";
import { Type } from "class-transformer";
import {
  IsDate,
  IsDefined,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinDate,
} from "class-validator";
import "reflect-metadata";

export class UpdateBCPDto {
  @IsOptional()
  @IsString({ message: "Customer name must be of type string" })
  readonly name?: string;

  @IsOptional()
  @IsEmail({}, { message: "Email must be a valid email address" })
  readonly email?: string;

  @IsOptional()
  @IsString({ message: "Phone number must be of type string" })
  readonly phone?: string;

  @IsOptional()
  @IsEnum(PaymentInterval, {
    message: "Unsupported payment interval $value",
  })
  readonly paymentInterval?: PaymentInterval;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: "Last payment must be a valid date" })
  readonly lastPayment?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: "Next payment must be a valid date" })
  @MinDate(new Date(), {
    message: "Next payment must be in the future",
  })
  readonly nextPayment?: Date;
}

export class CreateBCPDto {
  @IsDefined({ message: "Please provide file ID" })
  @IsString({ message: "File ID must be of type string" })
  readonly fileId!: string;

  @IsDefined({ message: "Please provide customer name" })
  @IsString({ message: "Customer name must be of type string" })
  readonly name!: string;

  @IsDefined({ message: "Please provide email" })
  @IsEmail({}, { message: "Email must be a valid email address" })
  readonly email!: string;

  @IsOptional()
  @IsString({ message: "Phone number must be of type string" })
  readonly phone?: string;

  @IsDefined({ message: "Please provide payment interval" })
  @IsEnum(PaymentInterval, {
    message: "Unsupported payment interval $value",
  })
  readonly paymentInterval!: PaymentInterval;

  @IsDefined({ message: "Please provide last payment date" })
  @Type(() => Date)
  @IsDate({ message: "Last payment must be a valid date" })
  readonly lastPayment!: Date;
}
