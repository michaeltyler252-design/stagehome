import { PublicController } from "../public.controller";

function buildServiceMock() {
  return {
    listCounties: jest.fn(),
    getCountyBySlug: jest.fn(),
    listUniversities: jest.fn(),
    getUniversityBySlug: jest.fn(),
    searchProperties: jest.fn(),
    getPropertyBySlug: jest.fn(),
  };
}

describe("PublicController", () => {
  let service: ReturnType<typeof buildServiceMock>;
  let controller: PublicController;

  beforeEach(() => {
    service = buildServiceMock();
    controller = new PublicController(service as any);
  });

  describe("listUniversities", () => {
    it("passes the countySlug query param through to the service — this exact wiring silently broke once already (the route read @Query(\"county\") while the DTO/frontend send \"countySlug\", so every county-scoped request silently returned every university instead of an error)", () => {
      controller.listUniversities("nakuru");
      expect(service.listUniversities).toHaveBeenCalledWith("nakuru");
    });

    it("passes undefined through when no countySlug is given, for the unfiltered /universities page", () => {
      controller.listUniversities(undefined);
      expect(service.listUniversities).toHaveBeenCalledWith(undefined);
    });
  });

  describe("getCounty", () => {
    it("passes the slug param through to getCountyBySlug", () => {
      controller.getCounty("kiambu");
      expect(service.getCountyBySlug).toHaveBeenCalledWith("kiambu");
    });
  });
});
