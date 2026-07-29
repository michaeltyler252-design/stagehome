const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

// Diagnostic for the single most common cause of a deployed site's
// registration/login/every-other-request failing with the browser's
// generic, unhelpful "Failed to fetch": NEXT_PUBLIC_API_BASE_URL was never
// set to the real backend URL in the frontend's production environment
// (Vercel project settings, not just a local .env — NEXT_PUBLIC_* vars are
// baked in at build time), so the deployed site is still trying to reach
// "http://localhost:4000", which means "a server on the visitor's own
// machine" and always fails. This only ever logs — it never changes
// behavior — but it turns an opaque failure into an actionable one line in
// the browser console.
if (typeof window !== "undefined") {
  const isApiBaseLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(API_BASE_URL);
  const isPageLocalhost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  if (isApiBaseLocalhost && !isPageLocalhost) {
    // eslint-disable-next-line no-console
    console.error(
      `[StageHome] This page is running at ${window.location.origin}, but NEXT_PUBLIC_API_BASE_URL ` +
        `resolved to "${API_BASE_URL}" — a localhost address. Every API request (including sign-up ` +
        "and sign-in) will fail with \"Failed to fetch\" until NEXT_PUBLIC_API_BASE_URL is set to the " +
        "real deployed API's URL in this environment's build configuration (e.g. the Vercel project's " +
        "Environment Variables, not just a local .env file — NEXT_PUBLIC_* values are baked in at build time)."
    );
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
      // Marketplace data changes as verification/publication happens — never
      // serve a stale cached response for anything that hits the API.
      cache: "no-store",
    });
  } catch (networkError) {
    // The bare browser error here is just "Failed to fetch" or
    // "NetworkError", with no indication of *what* it tried to reach —
    // exactly the unhelpful message this project's own registration bug
    // reports showed. Re-throwing with the actual URL turns "Failed to
    // fetch" into something a developer (or support) can act on directly:
    // wrong URL, CORS rejection, or the API genuinely being unreachable.
    throw new ApiError(
      `Could not reach the API at ${url}. This usually means NEXT_PUBLIC_API_BASE_URL is misconfigured, ` +
        "the API is unreachable, or the API's CORS allow-list (WEB_APP_ORIGIN) doesn't include this site's origin.",
      0
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(body.message ?? "Request failed", response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export interface County {
  id: string;
  name: string;
  slug: string;
  rolloutPhase: number | null;
  publishedPropertyCount?: number;
  verifiedUniversityCount?: number;
}

export interface UniversitySummary {
  officialName: string;
  slug: string;
  verificationStatus: string;
}

export interface PropertySummary {
  id: string;
  title: string;
  slug: string;
  publicReference: string;
  county: { name: string; slug: string };
  estate: { name: string; slug: string } | null;
  category: { name: string; key: string } | null;
  media: Array<{ storageKey: string; altText: string | null }>;
  pricingRules: Array<{ rentAmountMin: string; rentAmountMax: string | null; currency: string }>;
}

export interface SearchResult {
  results: PropertySummary[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const apiClient = {
  listCounties: () => request<County[]>("/public/counties"),
  getCounty: (slug: string) => request<County>(`/public/counties/${slug}`),
  listUniversities: (countySlug?: string) =>
    request<UniversitySummary[]>(
      `/public/universities${countySlug ? `?county=${encodeURIComponent(countySlug)}` : ""}`
    ),
  getUniversity: (slug: string) => request<any>(`/public/universities/${slug}`),
  searchProperties: (params: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    const qs = query.toString();
    return request<SearchResult>(`/public/properties${qs ? `?${qs}` : ""}`);
  },
  getProperty: (slug: string) => request<any>(`/public/properties/${slug}`),

  register: (data: {
    email: string;
    phone: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => request<any>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<any>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  requestOtp: (phone: string) =>
    request<any>("/auth/otp/request", { method: "POST", body: JSON.stringify({ phone }) }),
  verifyOtp: (phone: string, code: string) =>
    request<any>("/auth/otp/verify", { method: "POST", body: JSON.stringify({ phone, code }) }),

  // --- Authenticated manager endpoints ---
  listMyOrganisations: (accessToken: string) =>
    request<any[]>("/organisations/mine", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  createOrganisation: (accessToken: string, data: { name: string }) =>
    request<any>("/organisations", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    }),
  listOrganisationProperties: (accessToken: string, organisationId: string) =>
    request<any[]>(`/organisations/${organisationId}/properties`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  createManagerProperty: (
    accessToken: string,
    organisationId: string,
    data: { title: string; countyId: string; description?: string; address?: string }
  ) =>
    request<any>(`/organisations/${organisationId}/properties`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    }),
  submitPropertyForVerification: (accessToken: string, propertyId: string) =>
    request<any>(`/properties/${propertyId}/submit-for-verification`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }),

  // --- Booking flow (Milestone 7) ---
  createQuote: (accessToken: string, unitId: string, moveInDate?: string) =>
    request<any>(`/units/${unitId}/quotes`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(moveInDate ? { moveInDate } : {}),
    }),
  createHold: (accessToken: string, quoteId: string) =>
    request<any>(`/quotes/${quoteId}/hold`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  confirmBooking: (accessToken: string, holdId: string) =>
    request<any>(`/holds/${holdId}/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({}),
    }),
  listMyBookings: (accessToken: string) =>
    request<any[]>("/bookings/mine", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),

  // --- Dashboards (Milestone 11) ---
  getTenantDashboard: (accessToken: string) =>
    request<any>("/dashboard/tenant", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  getAdminDashboard: (accessToken: string) =>
    request<any>("/dashboard/admin", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),

  // --- Admin verification queue ---
  listVerificationQueue: (accessToken: string) =>
    request<any[]>("/admin/verification/queue", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  approveProperty: (accessToken: string, propertyId: string) =>
    request<any>(`/admin/verification/properties/${propertyId}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  publishProperty: (accessToken: string, propertyId: string) =>
    request<any>(`/admin/verification/properties/${propertyId}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  rejectProperty: (accessToken: string, propertyId: string, reason: string) =>
    request<any>(`/admin/verification/properties/${propertyId}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ reason }),
    }),

  // --- Admin university verification (promotion -> verification pipeline) ---
  listUniversityPromotionQueue: (accessToken: string) =>
    request<any[]>("/admin/verification/universities/promotion-queue", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  listUniversityVerificationQueue: (accessToken: string) =>
    request<any[]>("/admin/verification/universities/verification-queue", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  promoteUniversity: (accessToken: string, rawUniversityRecordId: string, countySlug?: string) =>
    request<any>(`/admin/verification/universities/${rawUniversityRecordId}/promote`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(countySlug ? { countySlug } : {}),
    }),
  verifyUniversity: (accessToken: string, universityId: string, notes?: string) =>
    request<any>(`/admin/verification/universities/${universityId}/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(notes ? { notes } : {}),
    }),
  rejectUniversity: (accessToken: string, universityId: string, reason: string) =>
    request<any>(`/admin/verification/universities/${universityId}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ reason }),
    }),

  // --- Admin property promotion (staging -> REVIEW, feeds the existing queue) ---
  listPropertyPromotionQueue: (accessToken: string) =>
    request<any[]>("/admin/verification/properties/promotion-queue", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  promoteProperty: (accessToken: string, rawPropertyRecordId: string, countySlug?: string) =>
    request<any>(`/admin/verification/properties/${rawPropertyRecordId}/promote`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(countySlug ? { countySlug } : {}),
    }),

  // --- Reviews ---
  listPropertyReviews: (propertyId: string) => request<any[]>(`/public/properties/${propertyId}/reviews`),
  createReview: (
    accessToken: string,
    bookingId: string,
    data: { overallRating: number; categories: Array<{ category: string; rating: number }> }
  ) =>
    request<any>(`/bookings/${bookingId}/reviews`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    }),
  respondToReview: (accessToken: string, reviewId: string, body: string) =>
    request<any>(`/reviews/${reviewId}/responses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ body }),
    }),

  // --- Blog ---
  listBlogPosts: () => request<any[]>("/public/blog"),
  getBlogPost: (slug: string) => request<any>(`/public/blog/${slug}`),
};
