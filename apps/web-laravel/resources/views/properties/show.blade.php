@extends('layouts.app')
@section('content')
<h1>{{ $property['title'] }}</h1>
<p>{{ $property['description'] ?? '' }}</p>
<p>{{ $property['address'] ?? 'Information Required' }}</p>
@if(session('access_token'))
    <form action="#" method="POST">
        @csrf
        <button type="submit">Save to favourites</button>
    </form>
@endif
@endsection
