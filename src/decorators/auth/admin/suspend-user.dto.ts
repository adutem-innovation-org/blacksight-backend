import { IsMongoId, IsNotEmpty, IsString } from "class-validator";

export class SuspendUserDto {
  @IsNotEmpty({ message: "Please provide the unique user's identifier" })
  @IsMongoId({ message: "Unique user identifier must be a valid" })
  userId!: string;

  @IsNotEmpty({ message: "Please provide suspension reason" })
  @IsString({ message: "Suspension reason must be a valid reason" })
  reason!: string;
}
