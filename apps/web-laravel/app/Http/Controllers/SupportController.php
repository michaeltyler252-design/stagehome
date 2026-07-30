<?php

namespace App\Http\Controllers;

use App\Services\StageHomeApiClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

class SupportController extends Controller
{
    public function __construct(private StageHomeApiClient $api) {}

    public function index()
    {
        if (! Session::has('access_token')) {
            return redirect('/sign-in');
        }
        return view('support.index', ['tickets' => $this->api->listMySupportTickets()]);
    }

    public function store(Request $request)
    {
        if (! Session::has('access_token')) {
            return redirect('/sign-in');
        }
        $validated = $request->validate(['subject' => 'required|string', 'body' => 'required|string']);
        $result = $this->api->createSupportTicket($validated['subject'], $validated['body']);
        return redirect('/support')->with('status', $result['ok'] ? 'Ticket submitted.' : 'Could not submit this ticket.');
    }
}
