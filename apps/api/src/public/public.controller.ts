import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PublicService } from "./public.service";
import { SearchPropertiesDto } from "./dto/search-properties.dto";

@ApiTags("public")
@Controller("public")
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get("counties")
  listCounties() {
    return this.publicService.listCounties();
  }

  @Get("counties/:slug")
  getCounty(@Param("slug") slug: string) {
    return this.publicService.getCountyBySlug(slug);
  }

  @Get("universities")
  listUniversities(@Query("countySlug") countySlug?: string) {
    return this.publicService.listUniversities(countySlug);
  }

  @Get("universities/:slug")
  getUniversity(@Param("slug") slug: string) {
    return this.publicService.getUniversityBySlug(slug);
  }

  @Get("properties")
  searchProperties(@Query() query: SearchPropertiesDto) {
    return this.publicService.searchProperties(query);
  }

  @Get("properties/:slug")
  getProperty(@Param("slug") slug: string) {
    return this.publicService.getPropertyBySlug(slug);
  }
}
