import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { PaymentsService } from "./payments.service";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("initiate")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  initiate(@CurrentUser() user: AuthenticatedUser, @Body() dto: InitiatePaymentDto, @Req() req: Request) {
    const callbackUrl = `${req.protocol}://${req.get("host")}/api/v1/payments/callback/mpesa`;
    return this.paymentsService.initiate(user, dto, callbackUrl);
  }

  /**
   * Daraja's webhook target. Deliberately NOT behind JwtAuthGuard — M-Pesa
   * cannot present a StageHome bearer token. Per Part B rule 11, this
   * callback is the ONLY thing allowed to move a payment to SUCCEEDED; a
   * browser redirect back from a payment page must never do so.
   */
  @Post("callback/mpesa")
  handleMpesaCallback(@Body() payload: any) {
    return this.paymentsService.handleCallback(payload);
  }

  @Post(":paymentId/refund")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin", "Accountant")
  requestRefund(
    @CurrentUser() user: AuthenticatedUser,
    @Param("paymentId") paymentId: string,
    @Body() dto: { amount: number; reason: string }
  ) {
    return this.paymentsService.requestRefund(paymentId, dto.amount, dto.reason, user.userId);
  }

  @Post("refunds/:refundId/approve")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin")
  approveRefund(@CurrentUser() user: AuthenticatedUser, @Param("refundId") refundId: string) {
    return this.paymentsService.approveRefund(refundId, user.userId);
  }
}
