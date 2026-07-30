<?php

namespace App\Http\Controllers;

use App\Services\StageHomeApiClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

class AdminController extends Controller
{
    public function __construct(private StageHomeApiClient $api) {}

    private function requireAuth()
    {
        if (! Session::has('access_token')) {
            return redirect('/sign-in');
        }
        return null;
    }

    public function dashboard()
    {
        if ($redirect = $this->requireAuth()) return $redirect;
        return view('admin.dashboard', ['dashboard' => $this->api->adminDashboard()]);
    }

    public function verificationQueue()
    {
        if ($redirect = $this->requireAuth()) return $redirect;
        return view('admin.verification-queue', [
            'queue' => $this->api->verificationQueue(),
            'propertyPromotionQueue' => $this->api->propertyPromotionQueue(),
            'universityPromotionQueue' => $this->api->universityPromotionQueue(),
            'universityVerificationQueue' => $this->api->universityVerificationQueue(),
        ]);
    }

    public function approveProperty(string $propertyId)
    {
        if ($redirect = $this->requireAuth()) return $redirect;
        $result = $this->api->approveProperty($propertyId);
        return back()->with('status', $result['ok'] ? 'Property approved.' : 'Could not approve this property.');
    }

    public function publishProperty(string $propertyId)
    {
        if ($redirect = $this->requireAuth()) return $redirect;
        $result = $this->api->publishProperty($propertyId);
        return back()->with('status', $result['ok'] ? 'Property published.' : ($result['body']['detail'] ?? 'Could not publish this property.'));
    }

    public function rejectProperty(Request $request, string $propertyId)
    {
        if ($redirect = $this->requireAuth()) return $redirect;
        $validated = $request->validate(['reason' => 'required|string']);
        $result = $this->api->rejectProperty($propertyId, $validated['reason']);
        return back()->with('status', $result['ok'] ? 'Property rejected.' : 'Could not reject this property.');
    }

    public function verifyUniversity(string $universityId)
    {
        if ($redirect = $this->requireAuth()) return $redirect;
        $result = $this->api->verifyUniversity($universityId);
        return back()->with('status', $result['ok'] ? 'University verified.' : 'Could not verify this university.');
    }

    public function rejectUniversity(Request $request, string $universityId)
    {
        if ($redirect = $this->requireAuth()) return $redirect;
        $validated = $request->validate(['reason' => 'required|string']);
        $result = $this->api->rejectUniversity($universityId, $validated['reason']);
        return back()->with('status', $result['ok'] ? 'University rejected.' : 'Could not reject this university.');
    }
}
