import { IsIn, IsString, MinLength } from "class-validator";

export class AddSupportMessageDto {
  @IsString()
  @MinLength(1)
  body!: string;
}

export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_ON_USER", "RESOLVED", "CLOSED"] as const;

export class UpdateTicketStatusDto {
  @IsIn(TICKET_STATUSES)
  status!: (typeof TICKET_STATUSES)[number];
}
