@extends('layouts.app')
@section('content')
<h1>Sign in</h1>
@if($errors->any())
    <div>
        @foreach($errors->all() as $error)
            <p>{{ $error }}</p>
        @endforeach
    </div>
@endif
<form method="POST" action="{{ route('login') }}">
    @csrf
    <label>Email <input type="email" name="email" value="{{ old('email') }}" required></label>
    <label>Password <input type="password" name="password" required></label>
    <button type="submit">Sign in</button>
</form>
<p><a href="{{ $googleLoginUrl }}">Sign in with Google</a></p>
@endsection
