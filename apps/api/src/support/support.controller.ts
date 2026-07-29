import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { SupportService } from "./support.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { AddSupportMessageDto, UpdateTicketStatusDto } from "./dto/ticket-actions.dto";

@ApiTags("support")
@ApiBearerAuth()
@Controller("support/tickets")
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(user, dto);
  }

  @Get("mine")
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.supportService.listMine(user.userId);
  }

  @Post(":ticketId/messages")
  addMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param("ticketId") ticketId: string,
    @Body() dto: AddSupportMessageDto
  ) {
    return this.supportService.addMessage(user, ticketId, dto.body);
  }

  @Get("all")
  @UseGuards(RolesGuard)
  @Roles("Admin", "Receptionist")
  listAll() {
    return this.supportService.listAll();
  }

  @Patch(":ticketId/status")
  @UseGuards(RolesGuard)
  @Roles("Admin", "Receptionist")
  updateStatus(@Param("ticketId") ticketId: string, @Body() dto: UpdateTicketStatusDto) {
    return this.supportService.updateStatus(ticketId, dto.status);
  }
}
