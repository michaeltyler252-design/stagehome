import { IsString, MinLength } from "class-validator";

export class CreateReviewResponseDto {
  @IsString()
  @MinLength(2)
  body!: string;
}
