import { IsDefined, Matches } from "class-validator";

export class EnableSMSMFADto {
  @IsDefined({ message: "Please provide phone number" })
  @Matches(/^\+?[0-9\s\-().]{7,20}$/, {
    message: "Please provide a valid phone number",
  })
  phoneNumber!: string;
}
