import { ReminderChannels, ReminderTypes } from "@/enums";
import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDate,
  IsDefined,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinDate,
  ValidateIf,
} from "class-validator";
import "reflect-metadata";

export class CreateReminderDto {
  @IsDefined({ message: "Please provide tag" })
  @IsString({ message: "Reminder tag must be of type string" })
  readonly tag!: string;

  @ValidateIf((o) => o.channel === ReminderChannels.EMAIL && !o.isBulk)
  @IsEmail({}, { message: "Email required for email-channel reminder" })
  email?: string;

  @ValidateIf((o) => o.channel === ReminderChannels.SMS && !o.isBulk)
  @IsString({ message: "Phone number required for sms-channel reminder" })
  phone?: string;

  @ValidateIf((o) => o.channel === ReminderChannels.EMAIL && o.isBulk)
  @IsArray({ message: "Emails should be an array" })
  @ArrayNotEmpty({
    message: "Emails required for bulk reminder with an email-channel",
  })
  @IsEmail(
    {},
    { each: true, message: "Each item in emails must be a valid email address" }
  )
  emails?: string[];

  @ValidateIf((o) => o.channel === ReminderChannels.SMS && o.isBulk)
  @IsArray({ message: "Phones should be an array" })
  @ArrayNotEmpty({
    message: "Phone numbers required for bulk reminder with SMS-channel",
  })
  @IsString({ each: true, message: "Each phone number must be a string" })
  phones?: string[];

  @IsEnum(ReminderChannels, {
    message: "Unsupported reminder channel $value",
  })
  channel!: ReminderChannels;

  @IsEnum(ReminderTypes, {
    message: "Unsupported reminder type $value",
  })
  type!: ReminderTypes;

  @IsDefined({ message: "Please specify reminder time" })
  @Type(() => Date)
  @IsDate()
  @MinDate(new Date(), {
    message: "Reminder time must be in the future",
  })
  remindAt!: Date;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBulk?: boolean;
}
