@extends('layouts.app')
@section('content')
<h1>Pay for your booking</h1>
@if($errors->any())
    @foreach($errors->all() as $error)<p>{{ $error }}</p>@endforeach
@endif
<form action="{{ route('payments.initiate', $bookingId) }}" method="POST">
    @csrf
    <label>M-Pesa phone number (2547XXXXXXXX) <input type="text" name="phone" pattern="2547[0-9]{8}" required></label>
    <button type="submit">Pay with M-Pesa</button>
</form>
@endsection
