import { IsOptional, IsString, IsUrl, MinLength } from "class-validator";

export class CreateBlogPostDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(10)
  excerpt!: string;

  @IsString()
  @MinLength(20)
  body!: string;

  @IsString()
  authorName!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;
}
