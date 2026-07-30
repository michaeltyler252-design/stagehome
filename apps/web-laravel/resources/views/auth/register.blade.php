@extends('layouts.app')
@section('content')
<h1>Create an account</h1>
<p>Password must be at least 10 characters.</p>
@if($errors->any())
    <div>
        @foreach($errors->all() as $error)
            <p>{{ $error }}</p>
        @endforeach
    </div>
@endif
<form method="POST" action="{{ route('register') }}">
    @csrf
    <label>First name <input type="text" name="first_name" value="{{ old('first_name') }}" required></label>
    <label>Last name <input type="text" name="last_name" value="{{ old('last_name') }}" required></label>
    <label>Email <input type="email" name="email" value="{{ old('email') }}" required></label>
    <label>Phone <input type="text" name="phone" value="{{ old('phone') }}"></label>
    <label>Password <input type="password" name="password" minlength="10" required></label>
    <button type="submit">Create account</button>
</form>
@endsection
