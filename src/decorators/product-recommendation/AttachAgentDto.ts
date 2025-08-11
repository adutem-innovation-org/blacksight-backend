import { IsMongoId, IsNotEmpty } from "class-validator";

export class AttachAgentDto {
  @IsNotEmpty({ message: "Please specify agent to attach products source to." })
  @IsMongoId({ message: "Agent id not a valid" })
  readonly agentId!: string;
}
