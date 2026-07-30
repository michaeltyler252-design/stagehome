@extends('layouts.app')
@section('content')
<h1>Leave a review</h1>
@if($errors->any())
    @foreach($errors->all() as $error)<p>{{ $error }}</p>@endforeach
@endif
<form action="{{ route('reviews.store', $bookingId) }}" method="POST">
    @csrf
    <label>Overall rating (1-5) <input type="number" name="overall_rating" min="1" max="5" step="0.5" required></label>
    @foreach(['accuracy', 'security', 'water', 'internet', 'cleanliness', 'management', 'value', 'distance'] as $category)
        <input type="hidden" name="category[]" value="{{ $category }}">
        <label>{{ ucfirst($category) }} (1-5) <input type="number" name="rating[]" min="1" max="5" required></label>
    @endforeach
    <button type="submit">Submit review</button>
</form>
@endsection
