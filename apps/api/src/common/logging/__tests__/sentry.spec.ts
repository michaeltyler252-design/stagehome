import * as Sentry from "@sentry/node";
import { initSentry } from "../sentry";

jest.mock("@sentry/node", () => ({ init: jest.fn() }));

describe("initSentry", () => {
  const originalDsn = process.env.SENTRY_DSN;

  afterEach(() => {
    process.env.SENTRY_DSN = originalDsn;
    jest.clearAllMocks();
  });

  it("does not call Sentry.init when SENTRY_DSN is unset", () => {
    delete process.env.SENTRY_DSN;
    initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("does not call Sentry.init when SENTRY_DSN is still the literal placeholder", () => {
    process.env.SENTRY_DSN = "Information Required";
    initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("calls Sentry.init with the DSN once a real-looking value is configured", () => {
    process.env.SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";
    initSentry();
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: "https://examplePublicKey@o0.ingest.sentry.io/0" })
    );
  });
});
