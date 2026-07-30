@extends('layouts.app')
@section('content')
<h1>My Favourites</h1>
@if(count($favourites) === 0)
    <p>You haven't saved any properties yet.</p>
@else
    <ul>
        @foreach($favourites as $fav)
            <li>
                Property: {{ $fav['propertyId'] }}
                <form action="{{ route('favourites.destroy', $fav['propertyId']) }}" method="POST" style="display:inline">
                    @csrf @method('DELETE')
                    <button type="submit">Remove</button>
                </form>
            </li>
        @endforeach
    </ul>
@endif
@endsection
