<?php

namespace App\Http\Controllers;

use App\Services\StageHomeApiClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

class ManagerController extends Controller
{
    public function __construct(private StageHomeApiClient $api) {}

    private function requireAuth()
    {
        if (! Session::has('access_token')) {
            return redirect('/sign-in');
        }
        return null;
    }

    public function organisations()
    {
        if ($redirect = $this->requireAuth()) return $redirect;
        return view('manager.organisations', ['organisations' => $this->api->listMyOrganisations()]);
    }

    public function createOrganisation(Request $request)
    {
        if ($redirect = $this->requireAuth()) return $redirect;
        $validated = $request->validate([
            'name' => 'required|string',
            'registration_number' => 'nullable|string',
            'kra_pin' => 'nullable|string',
        ]);
        $result = $this->api->createOrganisation($validated['name'], $validated['registration_number'] ?? null, $validated['kra_pin'] ?? null);
        return back()->with('status', $result['ok'] ? 'Organisation created.' : 'Could not create this organisation.');
    }

    public function dashboard(string $organisationId)
    {
        if ($redirect = $this->requireAuth()) return $redirect;
        return view('manager.dashboard', [
            'organisationId' => $organisationId,
            'dashboard' => $this->api->managerDashboard($organisationId),
            'properties' => $this->api->listOrganisationProperties($organisationId),
        ]);
    }

    public function createPropertyForm(string $organisationId)
    {
        if ($redirect = $this->requireAuth()) return $redirect;
        return view('manager.property-create', ['organisationId' => $organisationId]);
    }

    public function createProperty(Request $request, string $organisationId)
    {
        if ($redirect = $this->requireAuth()) return $redirect;
        $validated = $request->validate([
            'title' => 'required|string|min:3',
            'county_id' => 'required|string',
            'description' => 'nullable|string',
            'address' => 'nullable|string',
        ]);
        $result = $this->api->createManagerProperty($organisationId, $validated);
        if (! $result['ok']) {
            return back()->withErrors(['title' => $result['body']['detail'] ?? 'Could not create this property.'])->withInput();
        }
        return redirect("/manager/organisations/{$organisationId}/dashboard")->with('status', 'Property created as a draft.');
    }

    public function propertyShow(string $propertyId)
    {
        if ($redirect = $this->requireAuth()) return $redirect;
        $property = $this->api->getManagerProperty($propertyId);
        abort_if($property === null, 404);
        return view('manager.property-show', ['property' => $property]);
    }

    public function submitForVerification(string $propertyId)
    {
        if ($redirect = $this->requireAuth()) return $redirect;
        $result = $this->api->submitPropertyForVerification($propertyId);
        return back()->with('status', $result['ok'] ? 'Submitted for verification.' : 'Could not submit this property.');
    }

    public function addUnit(Request $request, string $propertyId)
    {
        if ($redirect = $this->requireAuth()) return $redirect;
        $validated = $request->validate([
            'public_label' => 'nullable|string',
            'bedrooms' => 'nullable|integer|min:0',
            'bathrooms' => 'nullable|integer|min:0',
            'furnished' => 'nullable|boolean',
        ]);
        $result = $this->api->addUnit($propertyId, $validated);
        return back()->with('status', $result['ok'] ? 'Unit added.' : 'Could not add this unit.');
    }
}
