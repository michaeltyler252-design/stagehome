@extends('layouts.app')
@section('content')
<h1>Counties</h1>
<ul>
    @foreach($counties as $county)
        <li>
            <a href="{{ route('counties.show', $county['slug']) }}">{{ $county['name'] }}</a>
            —
            @if(($county['publishedPropertyCount'] ?? 0) > 0 || ($county['verifiedUniversityCount'] ?? 0) > 0)
                {{ $county['publishedPropertyCount'] }} listings, {{ $county['verifiedUniversityCount'] }} universities
            @else
                No listings available yet
            @endif
        </li>
    @endforeach
</ul>
@endsection
