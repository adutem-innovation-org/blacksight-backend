import { IsDefined, IsString } from "class-validator";

export class UpdateAddressDto {
  @IsDefined({ message: "Please provide country" })
  @IsString({ message: "Country name must be string" })
  country!: string;

  @IsDefined({ message: "Please provide state" })
  @IsString({ message: "State name must be string" })
  state!: string;

  @IsDefined({ message: "Please provide city" })
  @IsString({ message: "City name must be string" })
  city!: string;

  @IsDefined({ message: "Please provide zip code" })
  @IsString({ message: "Zip/Postal code must be string" })
  zipCode!: string;
}
