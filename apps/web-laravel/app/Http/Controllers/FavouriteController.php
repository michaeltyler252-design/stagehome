<?php

namespace App\Http\Controllers;

use App\Services\StageHomeApiClient;
use Illuminate\Support\Facades\Session;

class FavouriteController extends Controller
{
    public function __construct(private StageHomeApiClient $api) {}

    public function store(string $propertyId)
    {
        if (! Session::has('access_token')) {
            return redirect('/sign-in');
        }
        $result = $this->api->addFavourite($propertyId);
        return back()->with('status', $result['ok'] ? 'Saved to favourites.' : 'Could not save this property.');
    }

    public function destroy(string $propertyId)
    {
        if (! Session::has('access_token')) {
            return redirect('/sign-in');
        }
        $this->api->removeFavourite($propertyId);
        return back()->with('status', 'Removed from favourites.');
    }

    public function index()
    {
        if (! Session::has('access_token')) {
            return redirect('/sign-in');
        }
        return view('favourites.index', ['favourites' => $this->api->listMyFavourites()]);
    }
}
