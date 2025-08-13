import { IsDefined, IsString, MinLength } from "class-validator";

export class ReplyTicketDto {
  @IsDefined({ message: "Please provide message" })
  @IsString({ message: "Message must be of type string" })
  @MinLength(2, { message: "Message must be at least 2 characters long" })
  readonly message!: string;
}
