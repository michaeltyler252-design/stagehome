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
        return view('auth.login', ['googleLoginUrl' => $this->api->googleLoginUrl()]);
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
        // Now that /auth/logout is genuinely implemented (see
        // apps/api-py/MIGRATION.md), this actually revokes the backend
        // session — not just clearing the local Laravel session, which
        // would leave the refresh token technically still valid.
        if (Session::has('refresh_token')) {
            $this->api->logout();
        }
        Session::forget(['access_token', 'refresh_token', 'user']);
        return redirect('/');
    }

    public function showVerifyPhone()
    {
        if (! Session::has('access_token')) {
            return redirect('/sign-in');
        }
        return view('auth.verify-phone');
    }

    public function requestOtp(Request $request)
    {
        if (! Session::has('access_token')) {
            return redirect('/sign-in');
        }
        $validated = $request->validate(['phone' => 'required|string']);
        $result = $this->api->requestOtp($validated['phone']);
        Session::put('otp_phone', $validated['phone']);
        return back()->with('status', $result['ok'] ? 'Verification code sent.' : 'Could not send a verification code.');
    }

    public function verifyOtp(Request $request)
    {
        if (! Session::has('access_token')) {
            return redirect('/sign-in');
        }
        $validated = $request->validate(['code' => 'required|string']);
        $phone = Session::get('otp_phone');
        if (! $phone) {
            return back()->withErrors(['code' => 'Request a verification code first.']);
        }
        $result = $this->api->verifyOtp($phone, $validated['code']);
        if (! $result['ok']) {
            return back()->withErrors(['code' => $result['body']['detail'] ?? 'Incorrect verification code.']);
        }
        return redirect('/dashboard')->with('status', 'Phone number verified.');
    }
}
