@extends('layouts.app')
@section('content')
<h1>Payment initiated</h1>
<p>Status: {{ $payment['status'] }}</p>
<p>Check your phone for the M-Pesa STK push prompt and enter your PIN to complete payment.</p>
<a href="{{ route('bookings.index') }}">Back to my bookings</a>
@endsection
