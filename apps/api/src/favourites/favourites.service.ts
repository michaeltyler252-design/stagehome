import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";

@Injectable()
export class FavouritesService {
  constructor(private readonly prisma: PrismaService) {}

  async add(user: AuthenticatedUser, propertyId: string) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException("Property not found.");
    }

    // Idempotent: favouriting an already-favourited property just returns
    // the existing row rather than erroring, since from the user's
    // perspective "favourite this" and "it's already favourited" should
    // both just result in it being favourited.
    return this.prisma.favourite.upsert({
      where: { userId_propertyId: { userId: user.userId, propertyId } },
      update: {},
      create: { userId: user.userId, propertyId },
    });
  }

  async remove(user: AuthenticatedUser, propertyId: string) {
    await this.prisma.favourite.deleteMany({
      where: { userId: user.userId, propertyId },
    });
    return { removed: true };
  }

  async listMine(user: AuthenticatedUser) {
    return this.prisma.favourite.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
      include: {
        property: {
          include: { county: true, media: true },
        },
      },
    });
  }
}
