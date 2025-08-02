import { UserActions } from "@/enums";
import { IsDefined, IsEnum, IsOptional, IsString } from "class-validator";

export class AskAgentDto {
  @IsDefined({ message: "Please provide user query" })
  @IsString({ message: "User query must be a valid string" })
  userQuery!: string;

  @IsOptional()
  @IsEnum(UserActions, { message: "Unsupported user action" })
  action?: UserActions;
}
