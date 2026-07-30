@extends('layouts.app')
@section('content')
<h1>{{ $property['title'] }}</h1>
<p>{{ $property['description'] ?? '' }}</p>
<p>{{ $property['address'] ?? 'Information Required' }}</p>

@if(session('access_token'))
    <form action="{{ route('favourites.store', $property['id']) }}" method="POST">
        @csrf
        <button type="submit">Save to favourites</button>
    </form>
@else
    <a href="{{ route('login') }}">Sign in to save this property</a>
@endif

@if(!empty($property['units']))
    <h2>Units</h2>
    <ul>
        @foreach($property['units'] as $unit)
            <li>
                {{ $unit['publicLabel'] ?? 'Unit' }}
                <form action="{{ route('bookings.quote', $unit['id']) }}" method="POST" style="display:inline">
                    @csrf
                    <button type="submit">Get a quote</button>
                </form>
            </li>
        @endforeach
    </ul>
@endif
@endsection
