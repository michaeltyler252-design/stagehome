// The full 47-county master structure, in the exact order specified by the
// operator. rolloutPhase now reflects each county's *position in this
// master list* — for display/ordering purposes (e.g. the /counties page) —
// and is no longer the mechanism that gates publishing. See
// apps/api/src/verification/verification.service.ts's APPROVED_COUNTY_SLUGS
// for why: with a 47-county list that isn't necessarily approved in strict
// list order, a single numeric "phase <= N" threshold can silently approve
// or un-approve counties that were never actually decided on, the moment
// this list is reordered. An explicit set of approved slugs has no such
// failure mode — reordering this list never changes what's actually live.
export const ROLLOUT_COUNTIES: Array<{ name: string; slug: string; rolloutPhase: number }> = [
  { name: "Nairobi City", slug: "nairobi-city", rolloutPhase: 1 },
  { name: "Kiambu", slug: "kiambu", rolloutPhase: 2 },
  { name: "Embu", slug: "embu", rolloutPhase: 3 },
  { name: "Meru", slug: "meru", rolloutPhase: 4 },
  { name: "Tharaka-Nithi", slug: "tharaka-nithi", rolloutPhase: 5 },
  { name: "Nyeri", slug: "nyeri", rolloutPhase: 6 },
  { name: "Kirinyaga", slug: "kirinyaga", rolloutPhase: 7 },
  { name: "Murang'a", slug: "muranga", rolloutPhase: 8 },
  { name: "Nyandarua", slug: "nyandarua", rolloutPhase: 9 },
  { name: "Laikipia", slug: "laikipia", rolloutPhase: 10 },
  { name: "Nakuru", slug: "nakuru", rolloutPhase: 11 },
  { name: "Uasin Gishu", slug: "uasin-gishu", rolloutPhase: 12 },
  { name: "Nandi", slug: "nandi", rolloutPhase: 13 },
  { name: "Elgeyo Marakwet", slug: "elgeyo-marakwet", rolloutPhase: 14 },
  { name: "Trans Nzoia", slug: "trans-nzoia", rolloutPhase: 15 },
  { name: "Baringo", slug: "baringo", rolloutPhase: 16 },
  { name: "West Pokot", slug: "west-pokot", rolloutPhase: 17 },
  { name: "Turkana", slug: "turkana", rolloutPhase: 18 },
  { name: "Samburu", slug: "samburu", rolloutPhase: 19 },
  { name: "Isiolo", slug: "isiolo", rolloutPhase: 20 },
  { name: "Marsabit", slug: "marsabit", rolloutPhase: 21 },
  { name: "Garissa", slug: "garissa", rolloutPhase: 22 },
  { name: "Wajir", slug: "wajir", rolloutPhase: 23 },
  { name: "Mandera", slug: "mandera", rolloutPhase: 24 },
  { name: "Machakos", slug: "machakos", rolloutPhase: 25 },
  { name: "Makueni", slug: "makueni", rolloutPhase: 26 },
  { name: "Kitui", slug: "kitui", rolloutPhase: 27 },
  { name: "Kajiado", slug: "kajiado", rolloutPhase: 28 },
  { name: "Narok", slug: "narok", rolloutPhase: 29 },
  { name: "Kericho", slug: "kericho", rolloutPhase: 30 },
  { name: "Bomet", slug: "bomet", rolloutPhase: 31 },
  { name: "Kisumu", slug: "kisumu", rolloutPhase: 32 },
  { name: "Siaya", slug: "siaya", rolloutPhase: 33 },
  { name: "Homa Bay", slug: "homa-bay", rolloutPhase: 34 },
  { name: "Migori", slug: "migori", rolloutPhase: 35 },
  { name: "Kisii", slug: "kisii", rolloutPhase: 36 },
  { name: "Nyamira", slug: "nyamira", rolloutPhase: 37 },
  { name: "Kakamega", slug: "kakamega", rolloutPhase: 38 },
  { name: "Vihiga", slug: "vihiga", rolloutPhase: 39 },
  { name: "Bungoma", slug: "bungoma", rolloutPhase: 40 },
  { name: "Busia", slug: "busia", rolloutPhase: 41 },
  { name: "Mombasa", slug: "mombasa", rolloutPhase: 42 },
  { name: "Kilifi", slug: "kilifi", rolloutPhase: 43 },
  { name: "Kwale", slug: "kwale", rolloutPhase: 44 },
  { name: "Taita Taveta", slug: "taita-taveta", rolloutPhase: 45 },
  { name: "Tana River", slug: "tana-river", rolloutPhase: 46 },
  { name: "Lamu", slug: "lamu", rolloutPhase: 47 },
];

// Counties with at least one real, audited property record staged, as of
// this delivery. Every county in this list has its own staging import
// script (see package.json's staging:import:* scripts) and verification
// registers in docs/data-quality/. Everything else in ROLLOUT_COUNTIES
// exists in the lookup table (so the schema/UI can reference any of the
// 47 counties by relation) but has zero source data yet — per the
// operator's explicit instruction, the public /counties page must not
// display these as if they had listings.
export const COUNTIES_WITH_DATA: string[] = [
  "nairobi-city",
  "kiambu",
  "nakuru",
  "kisumu",
  "embu",
  "meru",
  "tharaka-nithi",
  "machakos",
  "uasin-gishu",
  "kakamega",
  "nyeri",
  "kirinyaga",
  "muranga",
  "kisii",
  "mombasa",
  "kitui",
  "elgeyo-marakwet",
  "nandi",
  "baringo",
  "laikipia",
  "vihiga",
  "bungoma",
  "busia",
  "siaya",
  "homa-bay",
];
