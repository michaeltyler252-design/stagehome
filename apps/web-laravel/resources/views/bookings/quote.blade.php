@extends('layouts.app')
@section('content')
<h1>Your quote</h1>
<p>Rent: KES {{ $quote['quotedRent'] }}</p>
<p>Deposit: KES {{ $quote['quotedDeposit'] ?? 'Information Required' }}</p>
<p>Quote expires: {{ $quote['expiresAt'] }}</p>
<form action="{{ route('bookings.hold', $quote['id']) }}" method="POST">
    @csrf
    <button type="submit">Hold this unit</button>
</form>
@endsection
