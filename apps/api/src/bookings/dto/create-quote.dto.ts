import { IsDateString, IsOptional } from "class-validator";

export class CreateQuoteDto {
  @IsOptional()
  @IsDateString()
  moveInDate?: string;
}
