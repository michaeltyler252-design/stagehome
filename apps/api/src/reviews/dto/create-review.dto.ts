import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

// Mirrors ReviewCategory.category in schema.prisma's comment: accuracy |
// security | water | internet | cleanliness | management | value | distance.
export const REVIEW_CATEGORY_KEYS = [
  "accuracy",
  "security",
  "water",
  "internet",
  "cleanliness",
  "management",
  "value",
  "distance",
] as const;

class ReviewCategoryRatingDto {
  @IsIn(REVIEW_CATEGORY_KEYS)
  category!: (typeof REVIEW_CATEGORY_KEYS)[number];

  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;
}

export class CreateReviewDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReviewCategoryRatingDto)
  categories!: ReviewCategoryRatingDto[];
}
