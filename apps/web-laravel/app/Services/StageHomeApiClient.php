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
        $request = Http::baseUrl($this->baseUrl)->acceptJson();
        if ($token) {
            $request = $request->withToken($token);
        }
        return $request;
    }

    // --- Public: counties ---
    public function listCounties(): array
    {
        return $this->client()->get('/public/counties')->json() ?? [];
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
        return $this->client()->get('/public/universities', $query)->json() ?? [];
    }

    public function getUniversity(string $slug): ?array
    {
        $response = $this->client()->get("/public/universities/{$slug}");
        return $response->successful() ? $response->json() : null;
    }

    // --- Public: properties / search ---
    public function searchProperties(array $params = []): array
    {
        return $this->client()->get('/public/properties', $params)->json()
            ?? ['results' => [], 'pagination' => ['page' => 1, 'limit' => 12, 'total' => 0, 'totalPages' => 1]];
    }

    public function getProperty(string $slug): ?array
    {
        $response = $this->client()->get("/public/properties/{$slug}");
        return $response->successful() ? $response->json() : null;
    }

    // --- Blog ---
    public function listBlogPosts(): array
    {
        return $this->client()->get('/public/blog')->json() ?? [];
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
}
