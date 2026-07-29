import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadManifest, computeBatchChecksum, countySeedDataDir } from "../manifest";

describe.each(["nairobi", "kiambu", "nakuru", "kisumu", "embu", "meru", "tharaka-nithi", "machakos", "uasin-gishu", "kakamega", "nyeri", "kirinyaga", "muranga", "kisii", "mombasa", "kitui", "elgeyo-marakwet", "nandi", "baringo", "laikipia", "vihiga", "bungoma", "busia", "siaya", "homa-bay"])("%s staging import manifest", (countySlug) => {
  const manifest = loadManifest(countySlug);
  const dir = countySeedDataDir(countySlug);

  it("references a raw text file that actually exists on disk for every record", () => {
    for (const record of manifest.records) {
      expect(existsSync(join(dir, record.rawTextFile))).toBe(true);
    }
  });

  it("every raw text file is non-empty", () => {
    for (const record of manifest.records) {
      const text = readFileSync(join(dir, record.rawTextFile), "utf-8");
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });

  it("every record has a non-empty university and property name", () => {
    for (const record of manifest.records) {
      expect(record.university.trim().length).toBeGreaterThan(0);
      expect(record.property.trim().length).toBeGreaterThan(0);
    }
  });

  it("produces a deterministic checksum across repeated computations (idempotency requirement)", () => {
    const checksumA = computeBatchChecksum(countySlug, manifest);
    const checksumB = computeBatchChecksum(countySlug, manifest);
    expect(checksumA).toBe(checksumB);
    expect(checksumA).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces a DIFFERENT checksum from the other county (batches must not collide)", () => {
    const otherSlug = countySlug === "nairobi" ? "kiambu" : "nairobi";
    const otherManifest = loadManifest(otherSlug);
    const thisChecksum = computeBatchChecksum(countySlug, manifest);
    const otherChecksum = computeBatchChecksum(otherSlug, otherManifest);
    expect(thisChecksum).not.toBe(otherChecksum);
  });
  it("does not end with a stray markdown heading line (the clean-heading bleed pattern found and fixed during Embu's audit)", () => {
    for (const record of manifest.records) {
      const text = readFileSync(join(dir, record.rawTextFile), "utf-8").trimEnd();
      const lastLine = text.split("\n").pop() ?? "";
      // Match a standalone "### Heading" (exactly 3 hashes + space) — NOT a
      // legitimate "##### Sub-section" (5 hashes), which shares the "###"
      // substring but is real content, not bleed.
      expect(/^### [^#]/.test(lastLine.trim())).toBe(false);
    }
  });
});

describe("Nairobi staging import manifest — specifics", () => {
  const manifest = loadManifest("nairobi");

  it("contains exactly the 11 audited Nairobi property records (Station View Residency counted as 2 conflicting rows)", () => {
    expect(manifest.records).toHaveLength(12);
  });

  it("flags both Station View Residency records as a conflict, not a silent merge", () => {
    const stationViewRecords = manifest.records.filter(
      (r) => r.property === "Station View Residency"
    );
    expect(stationViewRecords).toHaveLength(2);
    for (const record of stationViewRecords) {
      expect(record.knownIssues.some((issue) => issue.includes("FLAGGED"))).toBe(true);
    }
  });
});

describe("Kiambu staging import manifest — specifics", () => {
  const manifest = loadManifest("kiambu");

  it("contains exactly the 3 audited Kiambu property records", () => {
    expect(manifest.records).toHaveLength(3);
  });

  it("carries forward the master document's own incomplete-record flag for Juja Academic Heights", () => {
    const record = manifest.records.find((r) => r.property === "Juja Academic Heights");
    expect(record).toBeDefined();
    expect(record!.knownIssues.length).toBeGreaterThan(0);
  });
});

describe("Nakuru staging import manifest — specifics", () => {
  const manifest = loadManifest("nakuru");

  it("contains exactly the 1 audited Nakuru property record", () => {
    expect(manifest.records).toHaveLength(1);
  });

  it("has no known issues flagged for its single, fully-detailed record", () => {
    expect(manifest.records[0].knownIssues).toHaveLength(0);
  });
});

describe("Kisumu staging import manifest — specifics", () => {
  const manifest = loadManifest("kisumu");

  it("contains exactly the 3 audited Kisumu property records", () => {
    expect(manifest.records).toHaveLength(3);
  });

  it("flags the Kisii-University-in-Kisumu naming distinction rather than silently conflating it with Kisii County", () => {
    const record = manifest.records.find((r) => r.property === "Milimani View Residency");
    expect(record).toBeDefined();
    expect(record!.knownIssues.some((issue) => issue.includes("Kisii County"))).toBe(true);
  });
});

describe("Embu staging import manifest — specifics", () => {
  const manifest = loadManifest("embu");

  it("contains exactly the 1 audited Embu property record", () => {
    expect(manifest.records).toHaveLength(1);
  });

  it("has a cleanly bounded raw text file with no trailing county-heading bleed", () => {
    const dir = countySeedDataDir("embu");
    const text = readFileSync(join(dir, manifest.records[0].rawTextFile), "utf-8");
    expect(text).not.toMatch(/## [A-Z]+ COUNTY/);
  });
});

describe("Meru staging import manifest — specifics", () => {
  const manifest = loadManifest("meru");

  it("contains exactly the 1 audited Meru property record", () => {
    expect(manifest.records).toHaveLength(1);
  });

  it("has no known issues flagged for its single, complete record", () => {
    expect(manifest.records[0].knownIssues).toHaveLength(0);
  });
});

describe("Tharaka-Nithi staging import manifest — specifics", () => {
  const manifest = loadManifest("tharaka-nithi");

  it("contains exactly the 1 audited Tharaka-Nithi property record", () => {
    expect(manifest.records).toHaveLength(1);
  });

  it("has no known issues flagged for its single, complete record", () => {
    expect(manifest.records[0].knownIssues).toHaveLength(0);
  });
});

describe("Machakos staging import manifest — specifics", () => {
  const manifest = loadManifest("machakos");

  it("contains exactly the 1 audited Machakos property record", () => {
    expect(manifest.records).toHaveLength(1);
  });

  it("notes the source document's own dedup consolidation rather than treating it as a new conflict", () => {
    expect(manifest.records[0].knownIssues.some((issue) => issue.includes("dedup"))).toBe(true);
  });
});

describe("Uasin Gishu staging import manifest — specifics", () => {
  const manifest = loadManifest("uasin-gishu");

  it("contains exactly the 1 audited Uasin Gishu property record", () => {
    expect(manifest.records).toHaveLength(1);
  });

  it("has no known issues flagged for its single, complete record", () => {
    expect(manifest.records[0].knownIssues).toHaveLength(0);
  });
});

describe("Kakamega staging import manifest — specifics", () => {
  const manifest = loadManifest("kakamega");

  it("contains exactly the 1 audited Kakamega property record", () => {
    expect(manifest.records).toHaveLength(1);
  });

  it("has a cleanly bounded raw text file with no trailing county-heading bleed", () => {
    const dir = countySeedDataDir("kakamega");
    const text = readFileSync(join(dir, manifest.records[0].rawTextFile), "utf-8");
    expect(text).not.toMatch(/VIHIGA/);
  });
});

describe("Nyeri staging import manifest — specifics", () => {
  const manifest = loadManifest("nyeri");

  it("contains exactly the 2 genuine audited Nyeri property records", () => {
    expect(manifest.records).toHaveLength(2);
  });

  it("never includes the JOOUST/Bondo Central Residencies record, which belongs to Siaya County, not Nyeri", () => {
    const names = manifest.records.map((r) => r.property);
    expect(names).not.toContain("Bondo Central Residencies");
    const universities = manifest.records.map((r) => r.university);
    expect(universities).not.toContain(
      "Jaramogi Oginga Odinga University of Science and Technology (JOOUST)"
    );
  });
});

describe("Kirinyaga staging import manifest — specifics", () => {
  const manifest = loadManifest("kirinyaga");

  it("contains exactly the 1 audited Kirinyaga property record", () => {
    expect(manifest.records).toHaveLength(1);
  });

  it("notes the source document's own dedup consolidation rather than treating it as a new conflict", () => {
    expect(manifest.records[0].knownIssues.some((issue) => issue.includes("dedup"))).toBe(true);
  });
});

describe("Murang'a staging import manifest — specifics", () => {
  const manifest = loadManifest("muranga");

  it("contains exactly the 1 audited Murang'a property record, from a user-supplied source distinct from the master document", () => {
    expect(manifest.records).toHaveLength(1);
    expect(manifest.records[0].sourceFile).toContain("user-supplied");
  });

  it("has no known issues — this record is complete", () => {
    expect(manifest.records[0].knownIssues).toHaveLength(0);
  });
});

describe("Kisii staging import manifest — specifics", () => {
  const manifest = loadManifest("kisii");

  it("contains exactly the 1 audited Kisii property record, from a user-supplied source distinct from the master document", () => {
    expect(manifest.records).toHaveLength(1);
    expect(manifest.records[0].sourceFile).toContain("user-supplied");
  });

  it("flags the record as incomplete rather than silently treating it as complete", () => {
    expect(manifest.records[0].knownIssues.length).toBeGreaterThan(0);
    expect(
      manifest.records[0].knownIssues.some((issue) => issue.toLowerCase().includes("cuts off"))
    ).toBe(true);
  });

  it("the raw text genuinely ends where the manifest says it does (no invented completion)", () => {
    const dir = countySeedDataDir("kisii");
    const text = readFileSync(join(dir, manifest.records[0].rawTextFile), "utf-8").trim();
    expect(text.endsWith("Select upper floor rooms feature step-out verandas.".replace(/\.$/, ""))).toBe(
      true
    );
    // No Contact Details / Availability / Reviews / Images sections should exist at all.
    expect(text).not.toMatch(/Contact Details/i);
    expect(text).not.toMatch(/Availability/i);
  });
});

describe("Mombasa staging import manifest — specifics", () => {
  const manifest = loadManifest("mombasa");

  it("contains exactly the 1 audited Mombasa property record, from a user-supplied source distinct from the master document", () => {
    expect(manifest.records).toHaveLength(1);
    expect(manifest.records[0].sourceFile).toContain("user-supplied");
  });

  it("has no known issues — this record is complete, closing the last true zero-data gap", () => {
    expect(manifest.records[0].knownIssues).toHaveLength(0);
  });

  it("the raw text includes Contact Details and Images sections (a genuinely complete record, unlike Kisii's)", () => {
    const dir = countySeedDataDir("mombasa");
    const text = readFileSync(join(dir, manifest.records[0].rawTextFile), "utf-8");
    expect(text).toMatch(/Contact Details/i);
    expect(text).toMatch(/Images/i);
    expect(text).toMatch(/Street View/i);
  });
});

describe("Vihiga staging import manifest — specifics", () => {
  const manifest = loadManifest("vihiga");

  it("contains exactly the 2 audited Vihiga property records", () => {
    expect(manifest.records).toHaveLength(2);
  });
});

describe("Siaya staging import manifest — specifics", () => {
  const manifest = loadManifest("siaya");

  it("contains the JOOUST/Bondo Central Residencies record previously excluded from Nyeri", () => {
    expect(manifest.records).toHaveLength(1);
    expect(manifest.records[0].property).toBe("Bondo Central Residencies");
    expect(manifest.records[0].university).toBe(
      "Jaramogi Oginga Odinga University of Science and Technology (JOOUST)"
    );
  });

  it("this exact property never appears in Nyeri's manifest (guards the original exclusion)", () => {
    const nyeriManifest = loadManifest("nyeri");
    const names = nyeriManifest.records.map((r) => r.property);
    expect(names).not.toContain("Bondo Central Residencies");
  });
});

describe("Homa Bay staging import manifest — specifics", () => {
  const manifest = loadManifest("homa-bay");

  it("contains exactly the 1 audited Homa Bay property record, flagged as severely incomplete", () => {
    expect(manifest.records).toHaveLength(1);
    expect(manifest.records[0].knownIssues.length).toBeGreaterThan(0);
  });

  it("the raw text genuinely ends after Google Maps Link, with no invented completion", () => {
    const dir = countySeedDataDir("homa-bay");
    const text = readFileSync(join(dir, manifest.records[0].rawTextFile), "utf-8").trim();
    expect(text.endsWith("Google Maps Link: Not Available")).toBe(true);
    expect(text).not.toMatch(/Rent & Pricing/i);
    expect(text).not.toMatch(/Contact Details/i);
  });
});
