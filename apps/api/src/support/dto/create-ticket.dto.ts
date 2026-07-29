import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export const SUPPORT_PRIORITIES = ["P0", "P1", "P2", "P3", "P4"] as const;

export class CreateTicketDto {
  @IsString()
  @MinLength(3)
  subject!: string;

  @IsString()
  @MinLength(5)
  body!: string;

  @IsOptional()
  @IsIn(SUPPORT_PRIORITIES)
  priority?: (typeof SUPPORT_PRIORITIES)[number];
}
