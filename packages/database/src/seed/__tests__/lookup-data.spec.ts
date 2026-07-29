import {
  PROPERTY_CATEGORIES,
  UNIT_CATEGORIES,
  AMENITIES,
  UTILITIES,
  ROLES,
  PERMISSIONS,
  CANCELLATION_POLICIES,
} from "../lookup-data";
import { ROLLOUT_COUNTIES } from "../rollout-counties";

function expectUniqueKeys<T extends { key: string }>(items: T[]) {
  const keys = items.map((i) => i.key);
  expect(new Set(keys).size).toBe(keys.length);
}

describe("seed lookup data", () => {
  it("has no duplicate property category keys", () => expectUniqueKeys(PROPERTY_CATEGORIES));
  it("has no duplicate unit category keys", () => expectUniqueKeys(UNIT_CATEGORIES));
  it("has no duplicate amenity keys", () => expectUniqueKeys(AMENITIES));
  it("has no duplicate utility keys", () => expectUniqueKeys(UTILITIES));
  it("has no duplicate cancellation policy keys", () => expectUniqueKeys(CANCELLATION_POLICIES));

  it("has no duplicate role names", () => {
    expect(new Set(ROLES).size).toBe(ROLES.length);
  });

  it("has no duplicate permission keys", () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
  });

  it("includes every property type listed in Part A of the master spec", () => {
    const requiredTypes = [
      "house",
      "hostel",
      "student_residence",
      "bedsitter",
      "studio",
      "shared_room",
      "private_room",
      "one_bedroom",
      "two_bedroom",
      "three_bedroom",
      "maisonette",
      "serviced_apartment",
    ];
    const keys = PROPERTY_CATEGORIES.map((c) => c.key);
    for (const type of requiredTypes) {
      expect(keys).toContain(type);
    }
  });

  it("lists exactly the 15 Phase 1 rollout counties in Part C's order", () => {
    expect(ROLLOUT_COUNTIES).toHaveLength(47);
    expect(ROLLOUT_COUNTIES[0].name).toBe("Nairobi City");
    expect(ROLLOUT_COUNTIES[46].name).toBe("Lamu");
    // rolloutPhase must be strictly increasing and match position + 1
    ROLLOUT_COUNTIES.forEach((county, index) => {
      expect(county.rolloutPhase).toBe(index + 1);
    });
  });
});
