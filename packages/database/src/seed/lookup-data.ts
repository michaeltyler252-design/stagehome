export const PROPERTY_CATEGORIES: Array<{ key: string; name: string }> = [
  { key: "house", name: "House" },
  { key: "hostel", name: "Hostel" },
  { key: "student_residence", name: "Student Residence" },
  { key: "bedsitter", name: "Bedsitter" },
  { key: "studio", name: "Studio" },
  { key: "shared_room", name: "Shared Room" },
  { key: "private_room", name: "Private Room" },
  { key: "one_bedroom", name: "One-Bedroom Apartment" },
  { key: "two_bedroom", name: "Two-Bedroom Apartment" },
  { key: "three_bedroom", name: "Three-Bedroom Apartment" },
  { key: "maisonette", name: "Maisonette" },
  { key: "serviced_apartment", name: "Serviced Apartment" },
];

// Same taxonomy is reused at unit level, per Part A's furnished/unfurnished note.
export const UNIT_CATEGORIES: Array<{ key: string; name: string }> = [
  ...PROPERTY_CATEGORIES,
  { key: "furnished", name: "Furnished Unit" },
  { key: "unfurnished", name: "Unfurnished Unit" },
];

export const AMENITIES: Array<{ key: string; name: string }> = [
  { key: "kitchen", name: "Kitchen" },
  { key: "hot_shower", name: "Hot Shower" },
  { key: "balcony", name: "Balcony" },
  { key: "wardrobes", name: "Wardrobes" },
  { key: "parking", name: "Parking" },
  { key: "gym", name: "Gym" },
  { key: "swimming_pool", name: "Swimming Pool" },
  { key: "rooftop", name: "Rooftop" },
  { key: "garden", name: "Garden" },
  { key: "study_area", name: "Study Area" },
];

export const UTILITIES: Array<{ key: string; name: string }> = [
  { key: "water", name: "Water Supply" },
  { key: "electricity", name: "Electricity" },
  { key: "fibre_internet", name: "Fibre Internet" },
  { key: "wifi", name: "Wi-Fi" },
  { key: "borehole", name: "Borehole" },
  { key: "solar", name: "Solar Power" },
  { key: "backup_generator", name: "Backup Generator" },
  { key: "laundry", name: "Laundry Area" },
  { key: "garbage_collection", name: "Garbage Collection" },
];

export const ROLES: string[] = [
  "Tenant",
  "Owner",
  "Manager",
  "Accountant",
  "Receptionist",
  "Maintenance",
  "Analyst",
  "Admin",
];

// Starter permission set matching each dashboard's listed responsibilities (Part K).
// Extended per-milestone as each feature area is implemented.
export const PERMISSIONS: string[] = [
  "properties.read",
  "properties.write",
  "bookings.read",
  "bookings.write",
  "bookings.refund",
  "payments.read",
  "payouts.manage",
  "verification.review",
  "verification.approve",
  "users.manage",
  "organisations.manage",
  "reviews.moderate",
  "support.respond",
  "audit_logs.read",
];

export const CANCELLATION_POLICIES: Array<{ key: string; name: string }> = [
  { key: "flexible", name: "Flexible" },
  { key: "moderate", name: "Moderate" },
  { key: "strict", name: "Strict" },
];
