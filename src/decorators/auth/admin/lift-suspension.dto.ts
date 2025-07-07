import { IsMongoId, IsNotEmpty } from "class-validator";

export class LiftSuspensionDto {
  @IsNotEmpty({ message: "Please provide the unique user's identifier" })
  @IsMongoId({ message: "Unique user identifier must be a valid" })
  userId!: string;
}
