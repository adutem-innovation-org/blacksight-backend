import { Type } from "class-transformer";
import { IsBoolean, IsDefined, IsOptional, IsString } from "class-validator";

export class AddKnowledgeBaseDto {
  @IsDefined({ message: "Pleae provide tag" })
  @IsString({ message: "Knowledge base tag must be of type string" })
  readonly tag!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readonly isActive?: boolean;
}
