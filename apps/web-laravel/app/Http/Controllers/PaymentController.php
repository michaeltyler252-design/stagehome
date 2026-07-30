<?php

namespace App\Http\Controllers;

use App\Services\StageHomeApiClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

class PaymentController extends Controller
{
    public function __construct(private StageHomeApiClient $api) {}

    public function form(string $bookingId)
    {
        if (! Session::has('access_token')) {
            return redirect('/sign-in');
        }
        return view('payments.form', ['bookingId' => $bookingId]);
    }

    public function initiate(Request $request, string $bookingId)
    {
        if (! Session::has('access_token')) {
            return redirect('/sign-in');
        }
        $validated = $request->validate([
            'phone' => 'required|regex:/^2547[0-9]{8}$/',
        ]);

        $result = $this->api->initiatePayment($bookingId, $validated['phone']);

        if (! $result['ok']) {
            return back()->withErrors(['phone' => $result['body']['detail'] ?? 'M-Pesa could not process this payment request.']);
        }

        return view('payments.pending', ['payment' => $result['body']]);
    }
}
