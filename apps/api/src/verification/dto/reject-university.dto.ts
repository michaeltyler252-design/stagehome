import { IsString, MinLength } from "class-validator";

export class RejectUniversityDto {
  @IsString()
  @MinLength(5)
  reason!: string;
}
