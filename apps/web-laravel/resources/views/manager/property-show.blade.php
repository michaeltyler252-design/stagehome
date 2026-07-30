@extends('layouts.app')
@section('content')
<h1>{{ $property['title'] }}</h1>
<p>Status: {{ $property['publicationStatus'] }} / {{ $property['verificationStatus'] }}</p>

@if(session('status'))<p>{{ session('status') }}</p>@endif

@if($property['publicationStatus'] === 'DRAFT')
    <form action="{{ route('manager.properties.submit', $property['id']) }}" method="POST">
        @csrf
        <button type="submit">Submit for verification</button>
    </form>
@endif

<h2>Add a unit</h2>
<form action="{{ route('manager.units.store', $property['id']) }}" method="POST">
    @csrf
    <label>Label <input type="text" name="public_label"></label>
    <label>Bedrooms <input type="number" name="bedrooms" min="0"></label>
    <label>Bathrooms <input type="number" name="bathrooms" min="0"></label>
    <label>Furnished <input type="checkbox" name="furnished" value="1"></label>
    <button type="submit">Add unit</button>
</form>
@endsection
