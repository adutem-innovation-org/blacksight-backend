import { IsDefined, IsEmail } from "class-validator";

export class NotificationDto {
  @IsDefined()
  readonly title!: string;

  @IsDefined()
  readonly body!: string;
}
