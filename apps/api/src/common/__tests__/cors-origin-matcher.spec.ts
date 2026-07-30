import { isAllowedOrigin } from "../cors-origin-matcher";

describe("isAllowedOrigin", () => {
  const explicitOrigins = ["https://stagehome-web.vercel.app", "http://localhost:3000"];

  it("allows an origin that's explicitly in WEB_APP_ORIGIN", () => {
    expect(isAllowedOrigin("https://stagehome-web.vercel.app", explicitOrigins)).toBe(true);
    expect(isAllowedOrigin("http://localhost:3000", explicitOrigins)).toBe(true);
  });

  it("allows any stagehome*.vercel.app origin even if not explicitly listed — the actual fix for Vercel's URL churn", () => {
    expect(isAllowedOrigin("https://stagehome-hqv2qor30-edward-bce1.vercel.app", explicitOrigins)).toBe(true);
    expect(isAllowedOrigin("https://stagehome-kenyan-student-housing-ma-omega.vercel.app", explicitOrigins)).toBe(
      true
    );
    expect(isAllowedOrigin("https://stagehomeanything.vercel.app", explicitOrigins)).toBe(true);
  });

  it("does NOT allow an unrelated vercel.app origin that doesn't start with 'stagehome'", () => {
    expect(isAllowedOrigin("https://someone-elses-app.vercel.app", explicitOrigins)).toBe(false);
  });

  it("does NOT allow a random, unconfigured non-Vercel origin", () => {
    expect(isAllowedOrigin("https://evil.example.com", explicitOrigins)).toBe(false);
  });

  it("does NOT allow http (non-https) even for a stagehome-prefixed vercel.app origin", () => {
    expect(isAllowedOrigin("http://stagehome-web.vercel.app", explicitOrigins)).toBe(false);
  });
});
