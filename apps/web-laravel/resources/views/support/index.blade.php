@extends('layouts.app')
@section('content')
<h1>Support</h1>
@if(session('status'))<p>{{ session('status') }}</p>@endif
<form action="{{ route('support.store') }}" method="POST">
    @csrf
    <label>Subject <input type="text" name="subject" required></label>
    <label>Message <textarea name="body" required></textarea></label>
    <button type="submit">Submit ticket</button>
</form>
<h2>My tickets</h2>
<ul>
    @foreach($tickets as $ticket)
        <li>{{ $ticket['subject'] }} — {{ $ticket['status'] }}</li>
    @endforeach
</ul>
@endsection
