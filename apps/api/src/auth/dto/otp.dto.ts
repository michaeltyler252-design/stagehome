import { IsString, Matches, Length } from "class-validator";

export class RequestOtpDto {
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: "phone must be a valid E.164-style number" })
  phone!: string;
}

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: "phone must be a valid E.164-style number" })
  phone!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
