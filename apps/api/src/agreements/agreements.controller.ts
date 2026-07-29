import { Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { AgreementsService } from "./agreements.service";

@ApiTags("agreements")
@Controller()
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Post("bookings/:bookingId/agreements")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  generate(@CurrentUser() user: AuthenticatedUser, @Param("bookingId") bookingId: string) {
    return this.agreementsService.generate(user, bookingId);
  }

  // Not behind JwtAuthGuard — the token itself is the authentication, since
  // a signatory (especially the tenant before they've ever logged in on a
  // given device) reaches this from a link sent by email/SMS/WhatsApp, not
  // an authenticated session (Part I: "authenticated signing links").
  @Get("agreements/sign/:token")
  getByToken(@Param("token") token: string, @Req() req: Request) {
    return this.agreementsService.getByToken(token, req.ip);
  }

  @Post("agreements/sign/:token")
  sign(@Param("token") token: string, @Req() req: Request) {
    return this.agreementsService.sign(token, req.ip);
  }
}
