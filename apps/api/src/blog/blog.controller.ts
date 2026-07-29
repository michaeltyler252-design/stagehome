import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { BlogService } from "./blog.service";
import { CreateBlogPostDto } from "./dto/create-blog-post.dto";
import { UpdateBlogPostDto } from "./dto/update-blog-post.dto";

@ApiTags("blog")
@Controller()
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get("public/blog")
  listPublished() {
    return this.blogService.listPublished();
  }

  @Get("public/blog/:slug")
  getPublishedBySlug(@Param("slug") slug: string) {
    return this.blogService.getPublishedBySlug(slug);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin")
  @Get("admin/blog")
  listAllForAdmin() {
    return this.blogService.listAllForAdmin();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin")
  @Post("admin/blog")
  create(@Body() dto: CreateBlogPostDto) {
    return this.blogService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin")
  @Patch("admin/blog/:id")
  update(@Param("id") id: string, @Body() dto: UpdateBlogPostDto) {
    return this.blogService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin")
  @Post("admin/blog/:id/publish")
  publish(@Param("id") id: string) {
    return this.blogService.publish(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin")
  @Post("admin/blog/:id/unpublish")
  unpublish(@Param("id") id: string) {
    return this.blogService.unpublish(id);
  }
}
