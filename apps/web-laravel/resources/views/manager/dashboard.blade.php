@extends('layouts.app')
@section('content')
<h1>Manager Dashboard</h1>
<p>Total properties: {{ $dashboard['totalProperties'] ?? 0 }}</p>
<p>Total units: {{ $dashboard['totalUnits'] ?? 0 }}</p>
<p>Total revenue: KES {{ $dashboard['totalRevenue'] ?? 0 }}</p>

<a href="{{ route('manager.properties.create', $organisationId) }}">Add a new property</a>

<h2>Properties</h2>
<ul>
    @foreach($properties as $property)
        <li><a href="{{ route('manager.properties.show', $property['id']) }}">{{ $property['title'] }}</a> — {{ $property['publicationStatus'] }}</li>
    @endforeach
</ul>
@endsection
