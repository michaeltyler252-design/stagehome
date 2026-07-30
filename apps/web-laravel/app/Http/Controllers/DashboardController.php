<?php

namespace App\Http\Controllers;

use App\Services\StageHomeApiClient;
use Illuminate\Support\Facades\Session;

class DashboardController extends Controller
{
    public function __construct(private StageHomeApiClient $api) {}

    public function tenant()
    {
        if (! Session::has('access_token')) {
            return redirect('/login');
        }

        return view('dashboard.tenant', [
            'dashboard' => $this->api->tenantDashboard(),
            'favourites' => $this->api->listMyFavourites(),
            'notifications' => $this->api->listMyNotifications(),
            'bookings' => $this->api->listMyBookings(),
        ]);
    }
}
