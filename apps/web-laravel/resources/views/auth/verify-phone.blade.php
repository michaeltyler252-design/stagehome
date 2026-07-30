@extends('layouts.app')
@section('content')
<h1>Verify your phone number</h1>
@if(session('status'))<p>{{ session('status') }}</p>@endif
@if($errors->any())
    @foreach($errors->all() as $error)<p>{{ $error }}</p>@endforeach
@endif
<form action="{{ route('auth.otp.request') }}" method="POST">
    @csrf
    <label>Phone number (2547XXXXXXXX) <input type="text" name="phone" required></label>
    <button type="submit">Send verification code</button>
</form>
<form action="{{ route('auth.otp.verify') }}" method="POST">
    @csrf
    <label>Verification code <input type="text" name="code" required></label>
    <button type="submit">Verify</button>
</form>
@endsection
