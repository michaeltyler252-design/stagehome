import { IsArray, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class BookingGuestDto {
  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class ConfirmBookingDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingGuestDto)
  guests?: BookingGuestDto[];
}
