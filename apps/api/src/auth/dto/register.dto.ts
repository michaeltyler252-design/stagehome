import { IsEmail, IsOptional, IsString, MinLength, Matches } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10)
  @Matches(/^\+?[0-9]{9,15}$/, { message: "phone must be a valid E.164-style number" })
  phone!: string;

  @IsString()
  @MinLength(10, { message: "password must be at least 10 characters" })
  password!: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}
