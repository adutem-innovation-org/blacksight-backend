import { CalendarProvidersEnum } from "@/enums";
import { IsDefined, IsEnum, IsString } from "class-validator";

export class ConnectProviderDto {
  @IsDefined({ message: "Please select a provider" })
  @IsString({ message: "Booking provider must be of type string" })
  @IsEnum(CalendarProvidersEnum, { message: "Unsupported booking provider" })
  provider!: CalendarProvidersEnum;

  @IsDefined({ message: "Please provide provider api key" })
  @IsString({ message: "Api key must be of type string" })
  apiKey!: string;
}

export class ConnectCalcomDto extends ConnectProviderDto {
  @IsDefined({ message: "Please provid calcom event type id" })
  @IsString({ message: "Calcom event type id must be string" })
  eventTypeId!: string;
}
