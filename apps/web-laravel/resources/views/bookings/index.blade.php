@extends('layouts.app')
@section('content')
<h1>My Bookings</h1>
@if(session('status'))<p>{{ session('status') }}</p>@endif
@if(count($bookings) === 0)
    <p>You have no bookings yet.</p>
@else
    <ul>
        @foreach($bookings as $booking)
            <li>
                {{ $booking['id'] }} — {{ $booking['status'] }} — KES {{ $booking['agreedRent'] }}
                @if($booking['status'] === 'PENDING_PAYMENT')
                    <a href="{{ route('payments.form', $booking['id']) }}">Pay now</a>
                @endif
                @if($booking['status'] === 'COMPLETED')
                    <a href="{{ route('reviews.form', $booking['id']) }}">Leave a review</a>
                @endif
            </li>
        @endforeach
    </ul>
@endif
@endsection
