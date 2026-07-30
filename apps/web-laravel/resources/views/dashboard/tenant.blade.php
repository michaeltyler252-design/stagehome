@extends('layouts.app')
@section('content')
<h1>My Dashboard</h1>

<section>
    <h2>Active bookings: {{ $dashboard['counts']['activeBookings'] ?? 0 }}</h2>
    <ul>
        @foreach($bookings as $booking)
            <li>{{ $booking['id'] }} — {{ $booking['status'] }} — KES {{ $booking['agreedRent'] }}</li>
        @endforeach
    </ul>
</section>

<section>
    <h2>Favourites ({{ count($favourites) }})</h2>
    <ul>
        @foreach($favourites as $fav)
            <li>{{ $fav['propertyId'] }}</li>
        @endforeach
    </ul>
</section>

<section>
    <h2>Notifications</h2>
    <ul>
        @foreach($notifications as $n)
            <li>{{ $n['type'] }} — {{ $n['createdAt'] }}</li>
        @endforeach
    </ul>
</section>
@endsection
