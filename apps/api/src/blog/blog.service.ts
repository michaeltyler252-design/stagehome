import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateBlogPostDto } from "./dto/create-blog-post.dto";
import { UpdateBlogPostDto } from "./dto/update-blog-post.dto";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public list — same DRAFT-hiding rule Property/University already use. */
  async listPublished() {
    return this.prisma.blogPost.findMany({
      where: { publicationStatus: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImageUrl: true,
        authorName: true,
        category: true,
        publishedAt: true,
      },
    });
  }

  async getPublishedBySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { slug } });
    if (!post || post.publicationStatus !== "PUBLISHED") {
      throw new NotFoundException("Post not found or not yet published.");
    }
    return post;
  }

  // --- Admin authoring ---

  async listAllForAdmin() {
    return this.prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } });
  }

  async create(dto: CreateBlogPostDto) {
    const slugBase = slugify(dto.title);
    let slug = slugBase;
    if (await this.prisma.blogPost.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${randomUUID().slice(0, 6)}`;
    }
    return this.prisma.blogPost.create({
      data: { ...dto, slug, publicationStatus: "DRAFT" },
    });
  }

  async update(id: string, dto: UpdateBlogPostDto) {
    await this.getByIdOrThrow(id);
    return this.prisma.blogPost.update({ where: { id }, data: dto });
  }

  async publish(id: string) {
    await this.getByIdOrThrow(id);
    return this.prisma.blogPost.update({
      where: { id },
      data: { publicationStatus: "PUBLISHED", publishedAt: new Date() },
    });
  }

  async unpublish(id: string) {
    await this.getByIdOrThrow(id);
    return this.prisma.blogPost.update({
      where: { id },
      data: { publicationStatus: "DRAFT", publishedAt: null },
    });
  }

  private async getByIdOrThrow(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException("Blog post not found.");
    }
    return post;
  }
}
