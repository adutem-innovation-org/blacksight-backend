import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDefined,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";
import { Types } from "mongoose";

export class ConfigureBotDto {
  @IsDefined({ message: "Please provide bot name" })
  @IsString({ message: "Bot name must be string" })
  name!: string;

  @IsDefined({ message: "Please provide knowledge base identifier" })
  @IsMongoId({
    message: "Knowledge base identifier must be a valid database identifier",
  })
  knowledgeBaseId!: Types.ObjectId;

  @IsDefined({ message: "Please provide bot name" })
  @IsString({ message: "Bot name must be of type string" })
  @IsOptional()
  @IsString({ message: "Instructions must be of type string" })
  instructions?: string;

  @IsDefined({ message: "Please specify is meeting should be scheduled" })
  @Type(() => Boolean)
  @IsBoolean()
  scheduleMeeting!: boolean;

  @ValidateIf((o) => o.scheduleMeeting)
  @IsDefined({
    message:
      "Must provider meeting provider if automatically meeting scheduling is preferred",
  })
  @IsMongoId({
    message: "Meeting provider identifier must be a valid database identifier",
  })
  meetingProviderId?: Types.ObjectId;
}
