import {
  EventTrigger,
  RecurrencePattern,
  ReminderCategory,
  ReminderChannels,
  ReminderTypes,
} from "@/enums";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsDefined,
  IsEmail,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Min,
  ValidateIf,
} from "class-validator";
import "reflect-metadata";

export class CreateReminderDto {
  @IsDefined({ message: "Please provide reminder tag" })
  @IsString({ message: "Reminder tag must be of type string" })
  readonly tag!: string;

  @IsDefined({ message: "Please provide reminder message" })
  @IsString({ message: "Reminder message must be of type string" })
  readonly message!: string;

  @IsOptional()
  @IsString({ message: "Subject must be of type string" })
  readonly subject?: string;

  @IsDefined({ message: "Please specify reminder channel" })
  @IsEnum(ReminderChannels, {
    message: "Unsupported reminder channel",
  })
  readonly channel!: ReminderChannels;

  @IsDefined({ message: "Please specify reminder category" })
  @IsEnum(ReminderCategory, {
    message: "Unsupported reminder category",
  })
  readonly category!: ReminderCategory;

  @IsDefined({ message: "Please specify reminder type" })
  @IsEnum(ReminderTypes, {
    message: "Unsupported reminder type",
  })
  readonly type!: ReminderTypes;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBulk?: boolean;

  // Email validation
  @ValidateIf(
    (o) =>
      (o.channel === ReminderChannels.EMAIL ||
        o.channel === ReminderChannels.BOTH) &&
      !o.isBulk
  )
  @IsOptional()
  @IsEmail({}, { message: "Email must be a valid email address" })
  readonly email?: string;

  @ValidateIf(
    (o) =>
      (o.channel === ReminderChannels.EMAIL ||
        o.channel === ReminderChannels.BOTH) &&
      o.isBulk
  )
  @IsOptional()
  @IsArray({ message: "Emails must be an array" })
  @IsEmail({}, { each: true, message: "Each email must be valid" })
  readonly emails?: string[];

  // Phone validation
  @ValidateIf(
    (o) =>
      (o.channel === ReminderChannels.SMS ||
        o.channel === ReminderChannels.BOTH) &&
      !o.isBulk
  )
  @IsOptional()
  @IsPhoneNumber(undefined, { message: "Phone must be a valid phone number" })
  readonly phone?: string;

  @ValidateIf(
    (o) =>
      (o.channel === ReminderChannels.SMS ||
        o.channel === ReminderChannels.BOTH) &&
      o.isBulk
  )
  @IsOptional()
  @IsArray({ message: "Phones must be an array" })
  @IsPhoneNumber(undefined, { each: true, message: "Each phone must be valid" })
  readonly phones?: string[];

  // Scheduled reminder fields
  @ValidateIf((o) => o.type === ReminderTypes.SCHEDULED)
  @IsDefined({ message: "Remind at date is required for scheduled reminders" })
  @Type(() => Date)
  @IsDate({ message: "Remind at must be a valid date" })
  readonly remindAt?: Date;

  // Recurring reminder fields
  @ValidateIf((o) => o.type === ReminderTypes.RECURRING)
  @IsDefined({
    message: "Recurrence pattern is required for recurring reminders",
  })
  @IsEnum(RecurrencePattern, {
    message: "Unsupported recurrence pattern",
  })
  readonly recurrencePattern?: RecurrencePattern;

  @ValidateIf((o) => o.type === ReminderTypes.RECURRING)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Recurrence interval must be an integer" })
  @Min(1, { message: "Recurrence interval must be at least 1" })
  readonly recurrenceInterval?: number;

  @ValidateIf((o) => o.type === ReminderTypes.RECURRING)
  @IsDefined({ message: "Start date is required for recurring reminders" })
  @Type(() => Date)
  @IsDate({ message: "Start date must be a valid date" })
  readonly startDate?: Date;

  @ValidateIf((o) => o.type === ReminderTypes.RECURRING)
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: "End date must be a valid date" })
  readonly endDate?: Date;

  @ValidateIf((o) => o.type === ReminderTypes.RECURRING)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Max executions must be an integer" })
  @Min(1, { message: "Max executions must be at least 1" })
  readonly maxExecutions?: number;

  @ValidateIf((o) => o.recurrencePattern === RecurrencePattern.CUSTOM)
  @IsOptional()
  @IsString({ message: "Custom cron expression must be a string" })
  readonly customCronExpression?: string;

  // Event-based reminder fields
  @ValidateIf((o) => o.type === ReminderTypes.EVENT_BASED)
  @IsDefined({ message: "Event date is required for event-based reminders" })
  @Type(() => Date)
  @IsDate({ message: "Event date must be a valid date" })
  readonly eventDate?: Date;

  @ValidateIf((o) => o.type === ReminderTypes.EVENT_BASED)
  @IsDefined({ message: "Event trigger is required for event-based reminders" })
  @IsEnum(EventTrigger, {
    message: "Unsupported event trigger",
  })
  readonly eventTrigger?: EventTrigger;

  @ValidateIf((o) => o.type === ReminderTypes.EVENT_BASED)
  @IsDefined({
    message: "Trigger offset is required for event-based reminders",
  })
  @Type(() => Number)
  @IsInt({ message: "Trigger offset must be an integer" })
  @Min(0, { message: "Trigger offset must be at least 0" })
  readonly triggerOffset?: number;

  @IsOptional()
  @IsString({ message: "Template must be of type string" })
  readonly template?: string;

  @IsOptional()
  @ValidateIf((o) => o.templateId !== "" && o.templateId !== undefined)
  @IsMongoId({
    message: "Template identifier must be a valid",
  })
  readonly templateId?: string;

  @IsOptional()
  @ValidateIf((o) => o.fileId !== "" && o.fileId !== undefined)
  @IsMongoId({
    message: "File identifier must be a valid",
  })
  readonly fileId?: string;

  @IsOptional()
  readonly templateData?: Record<string, any>;

  @IsOptional()
  @IsString({ message: "Timezone must be of type string" })
  readonly timezone?: string;

  @IsOptional()
  @IsInt({ message: "Priority must be an integer" })
  @Min(1, { message: "Priority must be at least 1" })
  readonly priority?: number;

  @IsOptional()
  @IsInt({ message: "Max retries must be an integer" })
  @Min(0, { message: "Max retries must be at least 0" })
  readonly maxRetries?: number;
}

export class UpdateReminderDto {
  @IsOptional()
  @IsString({ message: "Reminder tag must be of type string" })
  readonly tag?: string;

  @IsOptional()
  @IsString({ message: "Reminder message must be of type string" })
  readonly message?: string;

  @IsOptional()
  @IsString({ message: "Subject must be of type string" })
  readonly subject?: string;

  @IsOptional()
  @IsEnum(ReminderChannels, {
    message: "Unsupported reminder channel",
  })
  readonly channel?: ReminderChannels;

  @IsOptional()
  @IsEnum(ReminderCategory, {
    message: "Unsupported reminder category",
  })
  readonly category?: ReminderCategory;

  @IsOptional()
  @IsEnum(ReminderTypes, {
    message: "Unsupported reminder type",
  })
  readonly type?: ReminderTypes;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBulk?: boolean;

  @IsOptional()
  @IsEmail({}, { message: "Email must be a valid email address" })
  readonly email?: string;

  @IsOptional()
  @IsArray({ message: "Emails must be an array" })
  @IsEmail({}, { each: true, message: "Each email must be valid" })
  readonly emails?: string[];

  @IsOptional()
  @IsPhoneNumber(undefined, { message: "Phone must be a valid phone number" })
  readonly phone?: string;

  @IsOptional()
  @IsArray({ message: "Phones must be an array" })
  @IsPhoneNumber(undefined, { each: true, message: "Each phone must be valid" })
  readonly phones?: string[];

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: "Remind at must be a valid date" })
  readonly remindAt?: Date;

  @IsOptional()
  @IsEnum(RecurrencePattern, {
    message: "Unsupported recurrence pattern",
  })
  readonly recurrencePattern?: RecurrencePattern;

  @IsOptional()
  @IsInt({ message: "Recurrence interval must be an integer" })
  @Min(1, { message: "Recurrence interval must be at least 1" })
  readonly recurrenceInterval?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: "Start date must be a valid date" })
  readonly startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: "End date must be a valid date" })
  readonly endDate?: Date;

  @IsOptional()
  @IsInt({ message: "Max executions must be an integer" })
  @Min(1, { message: "Max executions must be at least 1" })
  readonly maxExecutions?: number;

  @IsOptional()
  @IsString({ message: "Custom cron expression must be a string" })
  readonly customCronExpression?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: "Event date must be a valid date" })
  readonly eventDate?: Date;

  @IsOptional()
  @IsEnum(EventTrigger, {
    message: "Unsupported event trigger",
  })
  readonly eventTrigger?: EventTrigger;

  @IsOptional()
  @IsInt({ message: "Trigger offset must be an integer" })
  @Min(0, { message: "Trigger offset must be at least 0" })
  readonly triggerOffset?: number;

  @IsOptional()
  @IsString({ message: "Template must be of type string" })
  readonly template?: string;

  @IsOptional()
  @ValidateIf((o) => o.templateId !== "" && o.templateId !== undefined)
  @IsMongoId({
    message: "Template identifier must be a valid",
  })
  readonly templateId?: string;

  @IsOptional()
  readonly templateData?: Record<string, any>;

  @IsOptional()
  @IsString({ message: "Timezone must be of type string" })
  readonly timezone?: string;

  @IsOptional()
  @IsInt({ message: "Priority must be an integer" })
  @Min(1, { message: "Priority must be at least 1" })
  readonly priority?: number;

  @IsOptional()
  @IsInt({ message: "Max retries must be an integer" })
  @Min(0, { message: "Max retries must be at least 0" })
  readonly maxRetries?: number;

  @IsOptional()
  @IsBoolean({ message: "Is active must be a boolean" })
  readonly isActive?: boolean;
}

export class SendInstantReminderDto {
  @IsDefined({ message: "Please provide reminder tag" })
  @IsString({ message: "Reminder tag must be of type string" })
  readonly tag!: string;

  @IsDefined({ message: "Please provide reminder message" })
  @IsString({ message: "Reminder message must be of type string" })
  readonly message!: string;

  @IsOptional()
  @IsString({ message: "Subject must be of type string" })
  readonly subject?: string;

  @IsDefined({ message: "Please specify reminder channel" })
  @IsEnum(ReminderChannels, {
    message: "Unsupported reminder channel",
  })
  readonly channel!: ReminderChannels;

  @IsDefined({ message: "Please specify reminder category" })
  @IsEnum(ReminderCategory, {
    message: "Unsupported reminder category",
  })
  readonly category!: ReminderCategory;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBulk?: boolean;

  // Email validation
  @ValidateIf(
    (o) =>
      (o.channel === ReminderChannels.EMAIL ||
        o.channel === ReminderChannels.BOTH) &&
      !o.isBulk
  )
  @IsOptional()
  @IsEmail({}, { message: "Email must be a valid email address" })
  readonly email?: string;

  @ValidateIf(
    (o) =>
      (o.channel === ReminderChannels.EMAIL ||
        o.channel === ReminderChannels.BOTH) &&
      o.isBulk
  )
  @IsOptional()
  @IsArray({ message: "Emails must be an array" })
  @ArrayMinSize(1, { message: "At least one email is required" })
  @IsEmail({}, { each: true, message: "Each email must be valid" })
  readonly emails?: string[];

  // Phone validation
  @ValidateIf(
    (o) =>
      (o.channel === ReminderChannels.SMS ||
        o.channel === ReminderChannels.BOTH) &&
      !o.isBulk
  )
  @IsOptional()
  @IsPhoneNumber(undefined, { message: "Phone must be a valid phone number" })
  readonly phone?: string;

  @ValidateIf(
    (o) =>
      (o.channel === ReminderChannels.SMS ||
        o.channel === ReminderChannels.BOTH) &&
      o.isBulk
  )
  @IsOptional()
  @IsArray({ message: "Phones must be an array" })
  @ArrayMinSize(1, { message: "At least one phone is required" })
  @IsPhoneNumber(undefined, { each: true, message: "Each phone must be valid" })
  readonly phones?: string[];

  @IsOptional()
  @IsString({ message: "Template must be of type string" })
  readonly template?: string;

  @IsOptional()
  @ValidateIf((o) => o.templateId !== "" && o.templateId !== undefined)
  @IsMongoId({
    message: "Template identifier must be a valid",
  })
  readonly templateId?: string;

  @IsOptional()
  @ValidateIf(
    (o) =>
      o.fileId !== "" &&
      o.fileId !== undefined &&
      o.category === ReminderCategory.PAYMENT
  )
  @IsMongoId({
    message: "File identifier must be a valid",
  })
  readonly fileId?: string;

  @IsOptional()
  readonly templateData?: Record<string, any>;
}
