<?php

namespace App\Http\Controllers;

use App\Services\StageHomeApiClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

class ReviewController extends Controller
{
    public function __construct(private StageHomeApiClient $api) {}

    public function form(string $bookingId)
    {
        if (! Session::has('access_token')) {
            return redirect('/sign-in');
        }
        return view('reviews.form', ['bookingId' => $bookingId]);
    }

    public function store(Request $request, string $bookingId)
    {
        if (! Session::has('access_token')) {
            return redirect('/sign-in');
        }
        $validated = $request->validate([
            'overall_rating' => 'required|numeric|min:1|max:5',
            'category' => 'required|array|min:1',
            'category.*' => 'required|in:accuracy,security,water,internet,cleanliness,management,value,distance',
            'rating' => 'required|array|min:1',
            'rating.*' => 'required|numeric|min:1|max:5',
        ]);

        $categories = [];
        foreach ($validated['category'] as $i => $category) {
            $categories[] = ['category' => $category, 'rating' => $validated['rating'][$i]];
        }

        $result = $this->api->createReview($bookingId, (float) $validated['overall_rating'], $categories);

        if (! $result['ok']) {
            return back()->withErrors(['review' => $result['body']['detail'] ?? 'Could not submit this review.']);
        }

        return redirect('/bookings')->with('status', 'Thank you — your review has been submitted.');
    }

    public function respond(Request $request, string $reviewId)
    {
        if (! Session::has('access_token')) {
            return redirect('/sign-in');
        }
        $validated = $request->validate(['body' => 'required|string|min:2']);
        $result = $this->api->respondToReview($reviewId, $validated['body']);
        return back()->with('status', $result['ok'] ? 'Response posted.' : 'Could not post your response.');
    }
}
