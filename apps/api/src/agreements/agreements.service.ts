import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { renderDefaultAgreement } from "./agreement-template";
import { NotificationsService } from "../notifications/notifications.service";

const SIGNING_LINK_TTL_DAYS = 14;

@Injectable()
export class AgreementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {}

  /**
   * Generates a tenancy agreement for a confirmed booking and issues one
   * authenticated signing link per signatory (tenant + the property's
   * organisation). Refuses to regenerate over an already-signed agreement —
   * "no silent post-signing replacement" (Part I) is enforced here, not just
   * documented.
   */
  async generate(user: AuthenticatedUser, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { include: { profile: true } },
        unit: {
          include: {
            property: { include: { organisation: true, houseRules: true } },
          },
        },
        agreements: true,
      },
    });
    if (!booking) {
      throw new NotFoundException("Booking not found.");
    }
    if (booking.userId !== user.userId && !user.roles.includes("Admin")) {
      throw new ForbiddenException("This booking belongs to a different account.");
    }
    if (booking.status !== "CONFIRMED") {
      throw new BadRequestException(
        `Cannot generate an agreement for a booking in status "${booking.status}"; it must be CONFIRMED (payment complete) first.`
      );
    }

    const alreadySealed = booking.agreements.some(
      (a: { status: string }) => a.status === "FULLY_SIGNED"
    );
    if (alreadySealed) {
      throw new BadRequestException(
        "This booking already has a fully signed agreement. Sealed agreements are never silently replaced — issue a formal amendment instead."
      );
    }

    const tenantName =
      [booking.user.profile?.firstName, booking.user.profile?.lastName].filter(Boolean).join(" ") ||
      booking.user.email ||
      booking.user.phone ||
      "Tenant";

    const bodyMarkdown = renderDefaultAgreement({
      tenantName,
      managerOrganisationName: booking.unit.property.organisation.name,
      propertyTitle: booking.unit.property.title,
      propertyAddress: booking.unit.property.address ?? "Information Required",
      unitLabel: booking.unit.publicLabel ?? "Information Required",
      agreedRent: `KES ${Number(booking.agreedRent).toLocaleString()}`,
      agreedDeposit: booking.agreedDeposit
        ? `KES ${Number(booking.agreedDeposit).toLocaleString()}`
        : "Information Required",
      moveInDate: booking.moveInDate ? booking.moveInDate.toDateString() : "Information Required",
      houseRules: booking.unit.property.houseRules,
    });

    const documentHash = createHash("sha256").update(bodyMarkdown).digest("hex");

    const agreement = await this.prisma.agreement.create({
      data: {
        bookingId: booking.id,
        status: "SENT",
        versions: {
          create: {
            version: 1,
            documentHash,
            bodyStorageKey: `agreements/${booking.id}/v1.md`, // real object storage is Milestone 4's media-pipeline follow-up
          },
        },
      },
      include: { versions: true },
    });

    const signatories = await Promise.all([
      this.prisma.agreementSignatory.create({
        data: { agreementId: agreement.id, userId: booking.userId, role: "tenant" },
      }),
      this.prisma.agreementSignatory.create({
        data: { agreementId: agreement.id, role: "manager" },
      }),
    ]);

    const signatureRequests = await Promise.all(
      signatories.map((signatory) =>
        this.prisma.signatureRequest.create({
          data: {
            signatoryId: signatory.id,
            authenticatedLinkToken: randomUUID(),
            expiresAt: new Date(Date.now() + SIGNING_LINK_TTL_DAYS * 24 * 60 * 60 * 1000),
          },
        })
      )
    );

    const tenantSigningLink = signatureRequests[0].authenticatedLinkToken;
    // Only the tenant signatory has a real userId today — the manager
    // signatory is created role-only (see the module report: resolving
    // "which specific manager user should sign" is a follow-up, not yet
    // implemented), so only the tenant gets notified here.
    await this.notificationsService.notify({
      userId: booking.userId,
      type: "agreement_signing_link",
      subject: "Your tenancy agreement is ready to sign",
      body: `Please review and sign your tenancy agreement for ${booking.unit.property.title}: /agreements/sign/${tenantSigningLink}`,
      payload: { agreementId: agreement.id },
    });

    return {
      agreement,
      bodyMarkdown,
      signingLinks: signatories.map((s, i) => ({
        role: s.role,
        token: signatureRequests[i].authenticatedLinkToken,
      })),
    };
  }

  /**
   * Fetches an agreement by its per-signatory link token. Never trusts a
   * booking or agreement id directly from an unauthenticated caller — the
   * token IS the authentication, per Part I ("authenticated signing links").
   */
  async getByToken(token: string, ipAddress?: string) {
    const request = await this.prisma.signatureRequest.findUnique({
      where: { authenticatedLinkToken: token },
      include: {
        signatory: {
          include: {
            agreement: { include: { versions: { orderBy: { version: "desc" }, take: 1 } } },
          },
        },
      },
    });
    if (!request) {
      throw new NotFoundException("Signing link not found or already used.");
    }
    if (request.expiresAt < new Date()) {
      throw new BadRequestException("This signing link has expired.");
    }

    await this.prisma.signatureEvent.create({
      data: { signatureRequestId: request.id, eventType: "viewed", ipAddress },
    });

    return {
      role: request.signatory.role,
      alreadySigned: Boolean(request.signatory.signedAt),
      agreementStatus: request.signatory.agreement.status,
      latestVersion: request.signatory.agreement.versions[0],
    };
  }

  /**
   * Records consent and seals the signature. Once every signatory on the
   * agreement has signed, the agreement moves to FULLY_SIGNED and a
   * SignedDocument is sealed — after which `generate()` above refuses to
   * ever touch this agreement again.
   */
  async sign(token: string, ipAddress?: string) {
    const request = await this.prisma.signatureRequest.findUnique({
      where: { authenticatedLinkToken: token },
      include: { signatory: { include: { agreement: { include: { signatories: true } } } } },
    });
    if (!request) {
      throw new NotFoundException("Signing link not found.");
    }
    if (request.expiresAt < new Date()) {
      throw new BadRequestException("This signing link has expired.");
    }
    if (request.signatory.signedAt) {
      throw new BadRequestException("This signatory has already signed.");
    }

    await this.prisma.signatureEvent.create({
      data: { signatureRequestId: request.id, eventType: "consented", ipAddress },
    });
    await this.prisma.signatureEvent.create({
      data: { signatureRequestId: request.id, eventType: "signed", ipAddress },
    });

    await this.prisma.agreementSignatory.update({
      where: { id: request.signatory.id },
      data: { signedAt: new Date() },
    });

    const allSignatories = await this.prisma.agreementSignatory.findMany({
      where: { agreementId: request.signatory.agreementId },
    });
    const stillPending = allSignatories.filter(
      (s: { id: string; signedAt: Date | null }) => s.id !== request.signatory.id && !s.signedAt
    );

    if (stillPending.length === 0) {
      await this.prisma.agreement.update({
        where: { id: request.signatory.agreementId },
        data: { status: "FULLY_SIGNED" },
      });
      await this.prisma.signedDocument.create({
        data: {
          agreementId: request.signatory.agreementId,
          storageKey: `agreements/${request.signatory.agreementId}/sealed.pdf`,
        },
      });
      return { fullySigned: true };
    }

    await this.prisma.agreement.update({
      where: { id: request.signatory.agreementId },
      data: { status: "PARTIALLY_SIGNED" },
    });
    return { fullySigned: false };
  }
}
