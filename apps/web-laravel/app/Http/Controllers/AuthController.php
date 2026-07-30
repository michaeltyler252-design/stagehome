<?php

namespace App\Http\Controllers;

use App\Services\StageHomeApiClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

class AuthController extends Controller
{
    public function __construct(private StageHomeApiClient $api) {}

    public function showRegister()
    {
        return view('auth.register');
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|min:1',
            'last_name' => 'required|string|min:1',
            'email' => 'required|email',
            'password' => 'required|string|min:10',
            'phone' => 'nullable|string',
        ]);

        $result = $this->api->register($validated);

        if (! $result['ok']) {
            return back()->withErrors(['email' => $result['body']['detail'] ?? 'Registration failed.'])->withInput();
        }

        Session::put('access_token', $result['body']['access_token']);
        Session::put('refresh_token', $result['body']['refresh_token']);
        Session::put('user', $result['body']['user']);

        return redirect('/dashboard');
    }

    public function showLogin()
    {
        return view('auth.login');
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $result = $this->api->login($validated['email'], $validated['password']);

        if (! $result['ok']) {
            return back()->withErrors(['email' => $result['body']['detail'] ?? 'Invalid email or password.'])->withInput();
        }

        Session::put('access_token', $result['body']['access_token']);
        Session::put('refresh_token', $result['body']['refresh_token']);
        Session::put('user', $result['body']['user']);

        return redirect('/dashboard');
    }

    public function logout()
    {
        // Note: the FastAPI backend's /auth/logout endpoint is not yet
        // ported (see apps/api-py/MIGRATION.md) — this clears the local
        // Laravel session only, matching what's actually implemented
        // server-side today rather than calling an endpoint that would 501.
        Session::forget(['access_token', 'refresh_token', 'user']);
        return redirect('/');
    }
}
