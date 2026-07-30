@extends('layouts.app')
@section('content')
<h1>Unit held</h1>
<p>This unit is reserved for you until {{ $hold['expiresAt'] }}.</p>
<form action="{{ route('bookings.confirm', $hold['id']) }}" method="POST">
    @csrf
    <label>Guest full name (optional) <input type="text" name="guest_name"></label>
    <label>Guest phone (optional) <input type="text" name="guest_phone"></label>
    <button type="submit">Confirm booking</button>
</form>
@endsection
