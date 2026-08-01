<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Session;

/**
 * HTTP client for the FastAPI backend (apps/api-py), mirroring the
 * structure of the previous Next.js frontend's lib/api-client.ts —
 * same endpoint paths, same method names conceptually, so anyone
 * comparing the two can trace each call directly.
 */
class StageHomeApiClient
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.stagehome_api.base_url'), '/');
    }

    private function client()
    {
        $token = Session::get('access_token');
        $request = Http::baseUrl($this->baseUrl)->acceptJson()->timeout(10);
        if ($token) {
            $request = $request->withToken($token);
        }
        return $request;
    }

    /**
     * Ensures a list response is always a real array of real arrays.
     * Found via a real production bug: a TypeError ("Cannot access
     * offset of type string on string") crashed multiple pages whose
     * Blade templates did $item['key'] on every element of a list
     * response, assuming every element was itself an associative array.
     * This guards every list-returning method in one place rather than
     * scattering the same defensive check across every controller and
     * view that consumes them.
     */
    private function normalizeList($value): array
    {
        if (!is_array($value)) {
            return [];
        }
        return array_values(array_filter($value, fn ($item) => is_array($item)));
    }

    // --- Public: counties ---
    public function listCounties(): array
    {
        return $this->normalizeList($this->client()->get('/public/counties')->json());
    }

    public function getCounty(string $slug): ?array
    {
        $response = $this->client()->get("/public/counties/{$slug}");
        return $response->successful() ? $response->json() : null;
    }

    // --- Public: universities ---
    public function listUniversities(?string $countySlug = null): array
    {
        $query = $countySlug ? ['countySlug' => $countySlug] : [];
        return $this->normalizeList($this->client()->get('/public/universities', $query)->json());
    }

    public function getUniversity(string $slug): ?array
    {
        $response = $this->client()->get("/public/universities/{$slug}");
        return $response->successful() ? $response->json() : null;
    }

    // --- Public: properties / search ---
    public function searchProperties(array $params = []): array
    {
        $result = $this->client()->get('/public/properties', $params)->json();
        if (!is_array($result)) {
            return ['results' => [], 'pagination' => ['page' => 1, 'limit' => 12, 'total' => 0, 'totalPages' => 1]];
        }
        $result['results'] = $this->normalizeList($result['results'] ?? []);
        return $result;
    }

    public function getProperty(string $slug): ?array
    {
        $response = $this->client()->get("/public/properties/{$slug}");
        return $response->successful() ? $response->json() : null;
    }

    // --- Blog ---
    public function listBlogPosts(): array
    {
        return $this->normalizeList($this->client()->get('/public/blog')->json());
    }

    public function getBlogPost(string $slug): ?array
    {
        $response = $this->client()->get("/public/blog/{$slug}");
        return $response->successful() ? $response->json() : null;
    }

    // --- Auth ---
    public function register(array $data): array
    {
        $response = $this->client()->post('/auth/register', $data);
        return ['ok' => $response->successful(), 'status' => $response->status(), 'body' => $response->json()];
    }

    public function login(string $email, string $password): array
    {
        $response = $this->client()->post('/auth/login', ['email' => $email, 'password' => $password]);
        return ['ok' => $response->successful(), 'status' => $response->status(), 'body' => $response->json()];
    }

    // --- Favourites ---
    public function addFavourite(string $propertyId): array
    {
        $response = $this->client()->post("/properties/{$propertyId}/favourite");
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    public function removeFavourite(string $propertyId): array
    {
        $response = $this->client()->delete("/properties/{$propertyId}/favourite");
        return ['ok' => $response->successful()];
    }

    public function listMyFavourites(): array
    {
        return $this->client()->get('/favourites/mine')->json() ?? [];
    }

    // --- Notifications ---
    public function listMyNotifications(): array
    {
        return $this->client()->get('/notifications/mine')->json() ?? [];
    }

    // --- Bookings ---
    public function createQuote(string $unitId, ?string $moveInDate = null): array
    {
        $response = $this->client()->post("/units/{$unitId}/quotes", array_filter(['move_in_date' => $moveInDate]));
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    public function createHold(string $quoteId): array
    {
        $response = $this->client()->post("/quotes/{$quoteId}/hold");
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    public function confirmBooking(string $holdId, array $guests = []): array
    {
        $response = $this->client()->post("/holds/{$holdId}/confirm", ['guests' => $guests]);
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    public function listMyBookings(): array
    {
        return $this->client()->get('/bookings/mine')->json() ?? [];
    }

    // --- Dashboards ---
    public function tenantDashboard(): ?array
    {
        $response = $this->client()->get('/dashboard/tenant');
        return $response->successful() ? $response->json() : null;
    }

    public function managerDashboard(string $organisationId): ?array
    {
        $response = $this->client()->get("/dashboard/manager/{$organisationId}");
        return $response->successful() ? $response->json() : null;
    }

    public function adminDashboard(): ?array
    {
        $response = $this->client()->get('/dashboard/admin');
        return $response->successful() ? $response->json() : null;
    }

    // --- Payments ---
    public function initiatePayment(string $bookingId, string $phone, ?string $idempotencyKey = null): array
    {
        $response = $this->client()->post('/payments/initiate', array_filter([
            'booking_id' => $bookingId,
            'phone' => $phone,
            'idempotency_key' => $idempotencyKey,
        ]));
        return ['ok' => $response->successful(), 'status' => $response->status(), 'body' => $response->json()];
    }

    // --- Reviews ---
    public function listReviewsForProperty(string $propertyId): array
    {
        return $this->client()->get("/public/properties/{$propertyId}/reviews")->json() ?? [];
    }

    public function createReview(string $bookingId, float $overallRating, array $categories): array
    {
        $response = $this->client()->post("/bookings/{$bookingId}/reviews", [
            'overall_rating' => $overallRating,
            'categories' => $categories,
        ]);
        return ['ok' => $response->successful(), 'status' => $response->status(), 'body' => $response->json()];
    }

    public function respondToReview(string $reviewId, string $body): array
    {
        $response = $this->client()->post("/reviews/{$reviewId}/responses", ['body' => $body]);
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    // --- Organisations ---
    public function createOrganisation(string $name, ?string $registrationNumber, ?string $kraPin): array
    {
        $response = $this->client()->post('/organisations', array_filter([
            'name' => $name,
            'registration_number' => $registrationNumber,
            'kra_pin' => $kraPin,
        ]));
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    public function listMyOrganisations(): array
    {
        return $this->client()->get('/organisations/mine')->json() ?? [];
    }

    // --- Manager: properties CRUD ---
    public function listOrganisationProperties(string $organisationId): array
    {
        return $this->client()->get("/organisations/{$organisationId}/properties")->json() ?? [];
    }

    public function createManagerProperty(string $organisationId, array $data): array
    {
        $response = $this->client()->post("/organisations/{$organisationId}/properties", $data);
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    public function getManagerProperty(string $propertyId): ?array
    {
        $response = $this->client()->get("/properties/{$propertyId}");
        return $response->successful() ? $response->json() : null;
    }

    public function updateManagerProperty(string $propertyId, array $data): array
    {
        $response = $this->client()->patch("/properties/{$propertyId}", $data);
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    public function submitPropertyForVerification(string $propertyId): array
    {
        $response = $this->client()->post("/properties/{$propertyId}/submit-for-verification");
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    public function addUnit(string $propertyId, array $data): array
    {
        $response = $this->client()->post("/properties/{$propertyId}/units", $data);
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    // --- Admin: verification workflows ---
    public function verificationQueue(): array
    {
        return $this->client()->get('/admin/verification/queue')->json() ?? [];
    }

    public function approveProperty(string $propertyId): array
    {
        $response = $this->client()->post("/admin/verification/properties/{$propertyId}/approve");
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    public function publishProperty(string $propertyId): array
    {
        $response = $this->client()->post("/admin/verification/properties/{$propertyId}/publish");
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    public function rejectProperty(string $propertyId, string $reason): array
    {
        $response = $this->client()->post("/admin/verification/properties/{$propertyId}/reject", ['reason' => $reason]);
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    public function propertyPromotionQueue(): array
    {
        return $this->client()->get('/admin/verification/properties/promotion-queue')->json() ?? [];
    }

    public function universityPromotionQueue(): array
    {
        return $this->client()->get('/admin/verification/universities/promotion-queue')->json() ?? [];
    }

    public function universityVerificationQueue(): array
    {
        return $this->client()->get('/admin/verification/universities/verification-queue')->json() ?? [];
    }

    public function verifyUniversity(string $universityId): array
    {
        $response = $this->client()->post("/admin/verification/universities/{$universityId}/verify");
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    public function rejectUniversity(string $universityId, string $reason): array
    {
        $response = $this->client()->post("/admin/verification/universities/{$universityId}/reject", ['reason' => $reason]);
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    // --- Support ---
    public function createSupportTicket(string $subject, string $body, ?string $priority = null): array
    {
        $response = $this->client()->post('/support/tickets', array_filter(['subject' => $subject, 'body' => $body, 'priority' => $priority]));
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    public function listMySupportTickets(): array
    {
        return $this->client()->get('/support/tickets/mine')->json() ?? [];
    }

    // --- Session lifecycle ---
    public function logout(): array
    {
        $refreshToken = Session::get('refresh_token');
        $response = $this->client()->post('/auth/logout', ['refresh_token' => $refreshToken]);
        return ['ok' => $response->successful()];
    }

    public function refreshToken(): array
    {
        $refreshToken = Session::get('refresh_token');
        $response = $this->client()->post('/auth/refresh', ['refresh_token' => $refreshToken]);
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    // --- Phone OTP verification ---
    public function requestOtp(string $phone): array
    {
        $response = $this->client()->post('/auth/otp/request', ['phone' => $phone]);
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    public function verifyOtp(string $phone, string $code): array
    {
        $response = $this->client()->post('/auth/otp/verify', ['phone' => $phone, 'code' => $code]);
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    // --- Admin MFA (TOTP) ---
    public function adminMfaSetup(): array
    {
        $response = $this->client()->post('/auth/admin-mfa/setup');
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    public function adminMfaVerify(string $code): array
    {
        $response = $this->client()->post('/auth/admin-mfa/verify', ['code' => $code]);
        return ['ok' => $response->successful(), 'body' => $response->json()];
    }

    // --- Google OAuth ---
    public function googleLoginUrl(): string
    {
        return $this->baseUrl.'/auth/google';
    }

    public function googleExchange(string $code): array
    {
        $response = $this->client()->post('/auth/google/exchange', ['code' => $code]);
        return ['ok' => $response->successful(), 'status' => $response->status(), 'body' => $response->json()];
    }
}
