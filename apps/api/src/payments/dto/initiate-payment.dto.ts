import { IsOptional, IsString, IsUUID, Matches } from "class-validator";

export class InitiatePaymentDto {
  @IsString()
  bookingId!: string;

  @IsString()
  @Matches(/^2547[0-9]{8}$/, { message: "phone must be in 2547XXXXXXXX format for STK push" })
  phone!: string;

  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}
