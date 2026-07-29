import { PartialType } from "@nestjs/swagger";
import { CreateBlogPostDto } from "./create-blog-post.dto";

// Matches the existing convention (see UpdatePropertyDto) — @nestjs/swagger's
// PartialType is already a dependency here, unlike @nestjs/mapped-types.
export class UpdateBlogPostDto extends PartialType(CreateBlogPostDto) {}
