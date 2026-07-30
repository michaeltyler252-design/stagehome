@extends('layouts.app')
@section('content')
<h1>{{ $county['name'] }}</h1>
<p>{{ $search['pagination']['total'] }} verified listings and {{ count($universities) }} verified universities live right now.</p>

@if(count($universities) === 0 && $search['pagination']['total'] === 0)
    <p>No listings available yet in this county. Properties and universities here are still moving through source-data verification.</p>
@else
    @if(count($universities) > 0)
        <h2>Verified universities</h2>
        <ul>
            @foreach($universities as $u)
                <li><a href="{{ route('universities.show', $u['slug']) }}">{{ $u['officialName'] }}</a></li>
            @endforeach
        </ul>
    @endif

    @if($search['pagination']['total'] > 0)
        <h2>Verified properties</h2>
        <ul>
            @foreach($search['results'] as $property)
                <li><a href="{{ route('properties.show', $property['slug']) }}">{{ $property['title'] }}</a></li>
            @endforeach
        </ul>
    @else
        <p>No verified properties yet in this county.</p>
    @endif
@endif
@endsection
