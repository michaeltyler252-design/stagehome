import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { CreateOrganisationDto } from "./dto/create-organisation.dto";

@Injectable()
export class OrganisationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateOrganisationDto) {
    const ownerRole = await this.prisma.role.upsert({
      where: { name: "Owner" },
      update: {},
      create: { name: "Owner" },
    });

    const organisation = await this.prisma.organisation.create({
      data: {
        name: dto.name,
        registrationNumber: dto.registrationNumber,
        kraPin: dto.kraPin,
        status: "PENDING_VERIFICATION",
        members: {
          create: { userId: user.userId, title: "Owner" },
        },
        userRoles: {
          create: { userId: user.userId, roleId: ownerRole.id },
        },
      },
    });

    return organisation;
  }

  async listForUser(user: AuthenticatedUser) {
    if (user.roles.includes("Admin")) {
      return this.prisma.organisation.findMany({ orderBy: { createdAt: "desc" } });
    }
    return this.prisma.organisation.findMany({
      where: { members: { some: { userId: user.userId } } },
      orderBy: { createdAt: "desc" },
    });
  }
}
