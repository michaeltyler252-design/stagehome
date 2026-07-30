@extends('layouts.app')
@section('content')
<h1>Search</h1>
<form method="GET" action="{{ route('search') }}">
    <input type="text" name="keyword" value="{{ $filters['keyword'] ?? '' }}" placeholder="Search properties">
    <button type="submit">Search</button>
</form>

@if(count($search['results']) === 0)
    <p>No verified listings match yet.</p>
@else
    <ul>
        @foreach($search['results'] as $property)
            <li><a href="{{ route('properties.show', $property['slug']) }}">{{ $property['title'] }}</a></li>
        @endforeach
    </ul>
@endif
@endsection
