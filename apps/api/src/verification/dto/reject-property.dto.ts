import { IsString, MinLength } from "class-validator";

export class RejectPropertyDto {
  @IsString()
  @MinLength(5)
  reason!: string;
}
