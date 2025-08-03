import { KnowledgeBaseSources } from "@/enums";
import {
  IsDefined,
  MaxLength,
  MinLength,
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import "reflect-metadata";

@ValidatorConstraint({ name: "NoBlockedTerms", async: false })
class NoBlockedTerms implements ValidatorConstraintInterface {
  validate(prompt: string, validationArguments?: ValidationArguments) {
    const blocked = ["hack", "exploit", "malware"];
    return !blocked.some((term) => prompt.toLowerCase().includes(term));
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return "Prompt contains blocked content";
  }
}

export class GenerateKnowledgeBaseDto {
  @IsDefined({ message: "Prompt is required" })
  @MinLength(1, { message: "Prompt cannot be empty" })
  @MaxLength(1000, { message: "Prompt too long (max 1000 characters)" })
  @Validate(NoBlockedTerms)
  prompt!: string;
}
