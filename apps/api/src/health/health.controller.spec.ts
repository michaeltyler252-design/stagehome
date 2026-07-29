import { Test, TestingModule } from "@nestjs/testing";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it("is defined", () => {
    expect(controller).toBeDefined();
  });

  it("returns an ok status with no indicators in Milestone 1", async () => {
    const result = await controller.check();
    expect(result.status).toBe("ok");
  });
});
