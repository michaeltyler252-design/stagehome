@extends('layouts.app')
@section('content')
<h1>My Organisations</h1>
@if(session('status'))<p>{{ session('status') }}</p>@endif
<ul>
    @foreach($organisations as $org)
        <li><a href="{{ route('manager.dashboard', $org['id']) }}">{{ $org['name'] }}</a> — {{ $org['status'] }}</li>
    @endforeach
</ul>
<h2>Create a new organisation</h2>
<form action="{{ route('manager.organisations.store') }}" method="POST">
    @csrf
    <label>Name <input type="text" name="name" required></label>
    <label>Registration number <input type="text" name="registration_number"></label>
    <label>KRA PIN <input type="text" name="kra_pin"></label>
    <button type="submit">Create</button>
</form>
@endsection
