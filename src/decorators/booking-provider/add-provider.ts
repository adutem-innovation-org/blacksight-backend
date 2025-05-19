import { MeetingProvidersEnum } from "@/enums";
import { IsDefined, IsEnum, IsString } from "class-validator";

export class AddBookingProviderDto {
  @IsDefined({ message: "Please select a provider" })
  @IsString({ message: "Booking provider must be of type string" })
  @IsEnum(MeetingProvidersEnum, { message: "Unsupported booking provider" })
  provider!: MeetingProvidersEnum;

  @IsDefined({ message: "Please provide provider api key" })
  @IsString({ message: "Api key must be of type string" })
  apiKey!: string;
}
