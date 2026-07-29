import { OrganisationsService } from "../organisations.service";
import { AuthenticatedUser } from "../../common/decorators/current-user.decorator";

function buildPrismaMock() {
  return {
    role: {
      upsert: jest.fn().mockResolvedValue({ id: "role-owner", name: "Owner" }),
    },
    organisation: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

const managerUser: AuthenticatedUser = {
  userId: "user-1",
  email: "manager@example.com",
  roles: ["Tenant"],
};

const adminUser: AuthenticatedUser = {
  userId: "admin-1",
  email: "admin@example.com",
  roles: ["Admin"],
};

describe("OrganisationsService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: OrganisationsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new OrganisationsService(prisma as any);
  });

  describe("create", () => {
    it("provisions the creator as an Owner member and Owner-role holder scoped to the new org", async () => {
      prisma.organisation.create.mockResolvedValue({ id: "org-1", name: "Acme Housing" });

      await service.create(managerUser, { name: "Acme Housing" });

      const createArgs = prisma.organisation.create.mock.calls[0][0].data;
      expect(createArgs.members.create).toEqual({ userId: "user-1", title: "Owner" });
      expect(createArgs.userRoles.create).toEqual({ userId: "user-1", roleId: "role-owner" });
      expect(createArgs.status).toBe("PENDING_VERIFICATION");
    });
  });

  describe("listForUser", () => {
    it("scopes results to organisations the user is a member of for non-admins", async () => {
      await service.listForUser(managerUser);

      const whereArg = prisma.organisation.findMany.mock.calls[0][0].where;
      expect(whereArg.members.some.userId).toBe("user-1");
    });

    it("returns all organisations for an Admin with no membership filter", async () => {
      await service.listForUser(adminUser);

      const callArgs = prisma.organisation.findMany.mock.calls[0][0];
      expect(callArgs.where).toBeUndefined();
    });
  });
});
