import { Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { FavouritesService } from "./favourites.service";

@ApiTags("favourites")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class FavouritesController {
  constructor(private readonly favouritesService: FavouritesService) {}

  @Post("properties/:propertyId/favourite")
  add(@CurrentUser() user: AuthenticatedUser, @Param("propertyId") propertyId: string) {
    return this.favouritesService.add(user, propertyId);
  }

  @Delete("properties/:propertyId/favourite")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("propertyId") propertyId: string) {
    return this.favouritesService.remove(user, propertyId);
  }

  @Get("favourites/mine")
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.favouritesService.listMine(user);
  }
}
