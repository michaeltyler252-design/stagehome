// Complete list of universities accredited by Kenya's Commission for
// University Education (CUE), sourced from CUE's official "Approved
// Universities in Kenya" register as at 12th March 2026 (reproduced by
// The Kenya Times, https://thekenyatimes.com/education/full-list-of-accredited-universities-in-kenya-and-their-charter-years/,
// itself citing https://www.cue.or.ke/images/2026/Institutional_Accreditation/Approved_Universities_March_2026.pdf).
//
// County assignments were independently verified per-institution against
// each university's own website, Wikipedia, or news coverage of its
// physical campus location — not guessed. A handful of newer/virtual-first
// institutions (Open University of Kenya, National Intelligence Research
// University) have lower-confidence county assignments, noted individually
// below, since they are new enough that independent sources on their
// physical campus are sparse.
//
// Where a university genuinely operates more than one real campus in
// different counties (confirmed via independent sources, not assumed),
// it appears once per county — e.g. Daystar University (Athi River main
// campus in Machakos, plus a real Nairobi campus), Mount Kenya University
// (Thika main campus in Kiambu, plus a real Parklands campus in Nairobi),
// Umma University (Kajiado main campus, plus a real Thika branch in
// Kiambu), and The East African University (main campus in Kajiado, plus
// a real Nairobi CBD campus).

export interface UniversitySeedEntry {
  officialName: string;
  slug: string;
  countySlug: string;
  type: "public" | "private";
}

export const KENYAN_UNIVERSITIES: UniversitySeedEntry[] = [
  // --- Public Chartered Universities ---
  { officialName: "University of Nairobi (UoN)", slug: "university-of-nairobi-uon", countySlug: "nairobi-city", type: "public" },
  { officialName: "Moi University", slug: "moi-university", countySlug: "uasin-gishu", type: "public" },
  { officialName: "Kenyatta University (City Campus)", slug: "kenyatta-university-city-campus", countySlug: "nairobi-city", type: "public" },
  { officialName: "Egerton University (Njoro)", slug: "egerton-university-njoro", countySlug: "nakuru", type: "public" },
  { officialName: "Jomo Kenyatta University of Agriculture and Technology (JKUAT)", slug: "jomo-kenyatta-university-of-agriculture-and-technology-jkuat", countySlug: "kiambu", type: "public" },
  { officialName: "Maseno University", slug: "maseno-university", countySlug: "kisumu", type: "public" },
  { officialName: "Masinde Muliro University of Science and Technology", slug: "masinde-muliro-university-of-science-and-technology", countySlug: "kakamega", type: "public" },
  { officialName: "Dedan Kimathi University of Technology", slug: "dedan-kimathi-university-of-technology", countySlug: "nyeri", type: "public" },
  { officialName: "Chuka University", slug: "chuka-university", countySlug: "tharaka-nithi", type: "public" },
  { officialName: "Technical University of Kenya (TUK)", slug: "technical-university-of-kenya-tuk", countySlug: "nairobi-city", type: "public" },
  { officialName: "Technical University of Mombasa", slug: "technical-university-of-mombasa", countySlug: "mombasa", type: "public" },
  { officialName: "Pwani University", slug: "pwani-university", countySlug: "kilifi", type: "public" },
  { officialName: "Kisii University", slug: "kisii-university", countySlug: "kisii", type: "public" },
  { officialName: "University of Eldoret", slug: "university-of-eldoret", countySlug: "uasin-gishu", type: "public" },
  { officialName: "Maasai Mara University", slug: "maasai-mara-university", countySlug: "narok", type: "public" },
  { officialName: "Jaramogi Oginga Odinga University of Science and Technology", slug: "jaramogi-oginga-odinga-university-of-science-and-technology", countySlug: "siaya", type: "public" },
  { officialName: "Laikipia University", slug: "laikipia-university", countySlug: "laikipia", type: "public" },
  { officialName: "South Eastern Kenya University", slug: "south-eastern-kenya-university", countySlug: "kitui", type: "public" },
  { officialName: "Meru University of Science and Technology", slug: "meru-university-of-science-and-technology", countySlug: "meru", type: "public" },
  { officialName: "Multimedia University of Kenya", slug: "multimedia-university-of-kenya", countySlug: "nairobi-city", type: "public" },
  { officialName: "University of Kabianga", slug: "university-of-kabianga", countySlug: "kericho", type: "public" },
  { officialName: "Karatina University", slug: "karatina-university", countySlug: "nyeri", type: "public" },
  { officialName: "Kibabii University", slug: "kibabii-university", countySlug: "bungoma", type: "public" },
  { officialName: "Rongo University", slug: "rongo-university", countySlug: "migori", type: "public" },
  { officialName: "Cooperative University of Kenya", slug: "cooperative-university-of-kenya", countySlug: "nairobi-city", type: "public" },
  { officialName: "Taita Taveta University", slug: "taita-taveta-university", countySlug: "taita-taveta", type: "public" },
  { officialName: "Murang'a University of Technology", slug: "murangas-university-of-technology", countySlug: "muranga", type: "public" },
  { officialName: "University of Embu", slug: "university-of-embu", countySlug: "embu", type: "public" },
  { officialName: "Machakos University", slug: "machakos-university", countySlug: "machakos", type: "public" },
  { officialName: "Kirinyaga University", slug: "kirinyaga-university", countySlug: "kirinyaga", type: "public" },
  { officialName: "Garissa University", slug: "garissa-university", countySlug: "garissa", type: "public" },
  { officialName: "Alupe University", slug: "alupe-university", countySlug: "busia", type: "public" },
  { officialName: "Kaimosi Friends University", slug: "kaimosi-friends-university", countySlug: "vihiga", type: "public" },
  { officialName: "Tom Mboya University", slug: "tom-mboya-university", countySlug: "homa-bay", type: "public" },
  { officialName: "Tharaka University", slug: "tharaka-university", countySlug: "tharaka-nithi", type: "public" },
  { officialName: "Bomet University", slug: "bomet-university", countySlug: "bomet", type: "public" },

  // --- Private Chartered Universities ---
  { officialName: "University of Eastern Africa, Baraton", slug: "university-of-eastern-africa-baraton", countySlug: "nandi", type: "private" },
  { officialName: "Catholic University of Eastern Africa (CUEA)", slug: "catholic-university-of-eastern-africa-cuea", countySlug: "nairobi-city", type: "private" },
  { officialName: "Daystar University (Nairobi Campus)", slug: "daystar-university-nairobi-campus", countySlug: "nairobi-city", type: "private" },
  { officialName: "Daystar University (Main Campus, Athi River)", slug: "daystar-university-main-campus-athi-river", countySlug: "machakos", type: "private" },
  { officialName: "Scott Christian University", slug: "scott-christian-university", countySlug: "machakos", type: "private" },
  { officialName: "USIU-Africa", slug: "usiu-africa", countySlug: "nairobi-city", type: "private" },
  { officialName: "Africa Nazarene University", slug: "africa-nazarene-university", countySlug: "kajiado", type: "private" },
  { officialName: "Kenya Methodist University", slug: "kenya-methodist-university", countySlug: "meru", type: "private" },
  { officialName: "St. Paul's University", slug: "st-pauls-university", countySlug: "kiambu", type: "private" },
  { officialName: "Pan Africa Christian University", slug: "pan-africa-christian-university", countySlug: "nairobi-city", type: "private" },
  { officialName: "Strathmore University", slug: "strathmore-university", countySlug: "nairobi-city", type: "private" },
  { officialName: "Kabarak University", slug: "kabarak-university", countySlug: "nakuru", type: "private" },
  { officialName: "Mount Kenya University (MKU - Parklands Campus)", slug: "mount-kenya-university-mku-parklands-campus", countySlug: "nairobi-city", type: "private" },
  { officialName: "Mount Kenya University (MKU - Main Campus, Thika)", slug: "mount-kenya-university-mku-main-campus-thika", countySlug: "kiambu", type: "private" },
  { officialName: "Africa International University (AIU)", slug: "africa-international-university-aiu", countySlug: "nairobi-city", type: "private" },
  { officialName: "Kenya Highlands University (formerly Kenya Highlands Evangelical University)", slug: "kenya-highlands-university", countySlug: "kericho", type: "private" },
  { officialName: "Great Lakes University of Kisumu", slug: "great-lakes-university-of-kisumu", countySlug: "kisumu", type: "private" },
  { officialName: "KCA University", slug: "kca-university", countySlug: "nairobi-city", type: "private" },
  { officialName: "Adventist University of Africa", slug: "adventist-university-of-africa", countySlug: "nairobi-city", type: "private" },
  { officialName: "KAG East University", slug: "kag-east-university", countySlug: "nairobi-city", type: "private" },
  { officialName: "Umma University (Main Campus, Kajiado)", slug: "umma-university-main-campus-kajiado", countySlug: "kajiado", type: "private" },
  { officialName: "Umma University (Thika Branch)", slug: "umma-university-thika-branch", countySlug: "kiambu", type: "private" },
  { officialName: "Presbyterian University of East Africa (PUEA)", slug: "presbyterian-university-of-east-africa-puea", countySlug: "kiambu", type: "private" },
  { officialName: "Aga Khan University", slug: "aga-khan-university", countySlug: "nairobi-city", type: "private" },
  { officialName: "Kiriri Women's University of Science and Technology", slug: "kiriri-womens-university-of-science-and-technology", countySlug: "nairobi-city", type: "private" },
  { officialName: "The East African University (Main Campus, Kajiado)", slug: "the-east-african-university-main-campus-kajiado", countySlug: "kajiado", type: "private" },
  { officialName: "The East African University (Nairobi CBD Campus)", slug: "the-east-african-university-nairobi-cbd-campus", countySlug: "nairobi-city", type: "private" },
  { officialName: "Zetech University", slug: "zetech-university", countySlug: "kiambu", type: "private" },
  { officialName: "Lukenya University", slug: "lukenya-university", countySlug: "makueni", type: "private" },
  { officialName: "Management University of Africa", slug: "management-university-of-africa", countySlug: "nairobi-city", type: "private" },
  { officialName: "Tangaza University", slug: "tangaza-university", countySlug: "nairobi-city", type: "private" },
  { officialName: "Islamic University of Kenya", slug: "islamic-university-of-kenya", countySlug: "kajiado", type: "private" },
  { officialName: "Riara University", slug: "riara-university", countySlug: "nairobi-city", type: "private" },
  { officialName: "Uzima University", slug: "uzima-university", countySlug: "kisumu", type: "private" },
  { officialName: "Gretsa University", slug: "gretsa-university", countySlug: "kiambu", type: "private" },
  { officialName: "Amref International University", slug: "amref-international-university", countySlug: "nairobi-city", type: "private" },

  // --- Specialised Degree-Awarding Universities (Public) ---
  { officialName: "National Defence University-Kenya", slug: "national-defence-university-kenya", countySlug: "nairobi-city", type: "public" },
  // Lower confidence: chartered 2023, still establishing physical
  // premises; assigned to Nairobi as its registered administrative HQ.
  { officialName: "Open University of Kenya", slug: "open-university-of-kenya", countySlug: "nairobi-city", type: "public" },
  // Lower confidence: very new institution tied to Kenya's National
  // Intelligence Service, whose headquarters are in Nairobi.
  { officialName: "National Intelligence Research University", slug: "national-intelligence-research-university", countySlug: "nairobi-city", type: "public" },

  // --- Public University Constituent Colleges ---
  { officialName: "Turkana University College", slug: "turkana-university-college", countySlug: "turkana", type: "public" },
  { officialName: "Koitaleel Samoei University College", slug: "koitaleel-samoei-university-college", countySlug: "nandi", type: "public" },
  { officialName: "Mama Ngina University College", slug: "mama-ngina-university-college", countySlug: "kiambu", type: "public" },
  { officialName: "Kenya Advanced Institute of Science and Technology (KAIST)", slug: "kenya-advanced-institute-of-science-and-technology-kaist", countySlug: "machakos", type: "public" },
  { officialName: "Nyandarua University College", slug: "nyandarua-university-college", countySlug: "nyandarua", type: "public" },
  { officialName: "Kabarnet University College", slug: "kabarnet-university-college", countySlug: "baringo", type: "public" },
  { officialName: "Makueni University College", slug: "makueni-university-college", countySlug: "makueni", type: "public" },

  // --- Private University Constituent Colleges ---
  { officialName: "Hekima University College", slug: "hekima-university-college", countySlug: "nairobi-city", type: "private" },
  { officialName: "Marist International University College", slug: "marist-international-university-college", countySlug: "nairobi-city", type: "private" },

  // --- Institutions with Letters of Interim Authority ---
  { officialName: "Pioneer International University", slug: "pioneer-international-university", countySlug: "nairobi-city", type: "private" },
  { officialName: "International Leadership University", slug: "international-leadership-university", countySlug: "nairobi-city", type: "private" },
  { officialName: "Consolata International University", slug: "consolata-international-university", countySlug: "nairobi-city", type: "private" },
  { officialName: "Outspan Global University", slug: "outspan-global-university", countySlug: "nyeri", type: "private" },
];
