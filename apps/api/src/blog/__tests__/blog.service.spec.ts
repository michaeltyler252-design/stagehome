import { NotFoundException } from "@nestjs/common";
import { BlogService } from "../blog.service";

function buildPrismaMock() {
  return {
    blogPost: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe("BlogService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: BlogService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new BlogService(prisma as any);
  });

  describe("getPublishedBySlug", () => {
    it("throws when the post doesn't exist", async () => {
      prisma.blogPost.findUnique.mockResolvedValue(null);
      await expect(service.getPublishedBySlug("missing")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws for a post that exists but isn't PUBLISHED", async () => {
      prisma.blogPost.findUnique.mockResolvedValue({ slug: "draft-post", publicationStatus: "DRAFT" });
      await expect(service.getPublishedBySlug("draft-post")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("returns a PUBLISHED post", async () => {
      const post = { slug: "moving-guide", publicationStatus: "PUBLISHED" };
      prisma.blogPost.findUnique.mockResolvedValue(post);
      await expect(service.getPublishedBySlug("moving-guide")).resolves.toEqual(post);
    });
  });

  describe("create", () => {
    it("creates a new post as DRAFT with a slugified title, deduping on collision", async () => {
      prisma.blogPost.findUnique.mockResolvedValueOnce({ id: "existing" }); // slug taken
      prisma.blogPost.create.mockResolvedValue({ id: "new-post" });

      const dto = {
        title: "Renting Tips For First-Years",
        excerpt: "Everything you need to know before signing.",
        body: "A full guide to renting your first student hostel.",
        authorName: "StageHome Team",
      };
      await service.create(dto as any);

      const callArg = prisma.blogPost.create.mock.calls[0][0];
      expect(callArg.data.slug).toMatch(/^renting-tips-for-first-years-[a-f0-9]{6}$/);
      expect(callArg.data.publicationStatus).toBe("DRAFT");
    });
  });

  describe("publish", () => {
    it("throws if the post doesn't exist", async () => {
      prisma.blogPost.findUnique.mockResolvedValue(null);
      await expect(service.publish("missing")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("sets PUBLISHED and stamps publishedAt", async () => {
      prisma.blogPost.findUnique.mockResolvedValue({ id: "p1" });
      prisma.blogPost.update.mockResolvedValue({ id: "p1", publicationStatus: "PUBLISHED" });

      await service.publish("p1");

      const callArg = prisma.blogPost.update.mock.calls[0][0];
      expect(callArg.where).toEqual({ id: "p1" });
      expect(callArg.data.publicationStatus).toBe("PUBLISHED");
      expect(callArg.data.publishedAt).toBeInstanceOf(Date);
    });
  });
});
