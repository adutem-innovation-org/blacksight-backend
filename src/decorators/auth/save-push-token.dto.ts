import { IsDefined, IsString } from "class-validator";

export class SavePushTokenDto {
  @IsDefined()
  @IsString()
  token!: string;
}
