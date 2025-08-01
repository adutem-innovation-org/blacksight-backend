import { IsDefined, IsString } from "class-validator";

export class AskAgentDto {
  @IsDefined({ message: "Please provide user query" })
  @IsString({ message: "User query must be a valid string" })
  userQuery!: string;
}
