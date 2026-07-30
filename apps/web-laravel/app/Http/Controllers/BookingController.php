<?php

namespace App\Http\Controllers;

use App\Services\StageHomeApiClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

class BookingController extends Controller
{
    public function __construct(private StageHomeApiClient $api) {}

    private function requireAuth()
    {
        if (! Session::has('access_token')) {
            return redirect('/sign-in');
        }
        return null;
    }

    public function index()
    {
        if ($redirect = $this->requireAuth()) return $redirect;
        return view('bookings.index', ['bookings' => $this->api->listMyBookings()]);
    }

    public function quote(Request $request, string $unitId)
    {
        if ($redirect = $this->requireAuth()) return $redirect;
        $result = $this->api->createQuote($unitId, $request->input('move_in_date'));
        if (! $result['ok']) {
            return back()->withErrors(['quote' => $result['body']['detail'] ?? 'Could not generate a quote.']);
        }
        return view('bookings.quote', ['quote' => $result['body']]);
    }

    public function hold(string $quoteId)
    {
        if ($redirect = $this->requireAuth()) return $redirect;
        $result = $this->api->createHold($quoteId);
        if (! $result['ok']) {
            return back()->withErrors(['hold' => $result['body']['detail'] ?? 'This unit is currently held by another renter.']);
        }
        return view('bookings.hold', ['hold' => $result['body']]);
    }

    public function confirm(Request $request, string $holdId)
    {
        if ($redirect = $this->requireAuth()) return $redirect;
        $guests = [];
        if ($request->filled('guest_name')) {
            $guests[] = ['fullName' => $request->input('guest_name'), 'phone' => $request->input('guest_phone')];
        }
        $result = $this->api->confirmBooking($holdId, $guests);
        if (! $result['ok']) {
            return back()->withErrors(['confirm' => $result['body']['detail'] ?? 'Could not confirm this booking.']);
        }
        return redirect('/bookings')->with('status', 'Booking confirmed. Proceed to payment to finish.');
    }
}
