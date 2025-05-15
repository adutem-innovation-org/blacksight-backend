import { MeetingProviders } from "@/enums";
import { IsDefined, IsEnum, IsString } from "class-validator";

export class AddBookingProviderDto {
  @IsDefined({ message: "Please select a provider" })
  @IsString({ message: "Booking provider must be of type string" })
  @IsEnum(MeetingProviders, { message: "Unsupported booking provider" })
  provider!: MeetingProviders;

  @IsDefined({ message: "Please provide provider api key" })
  @IsString({ message: "Api key must be of type string" })
  apiKey!: string;
}
