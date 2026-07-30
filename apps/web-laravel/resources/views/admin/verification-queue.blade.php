@extends('layouts.app')
@section('content')
<h1>Verification Queue</h1>
@if(session('status'))<p>{{ session('status') }}</p>@endif

<h2>Properties awaiting review</h2>
@foreach($queue as $property)
    <div>
        <p>{{ $property['title'] }} — {{ $property['publicationStatus'] }}</p>
        <form action="{{ route('admin.properties.approve', $property['id']) }}" method="POST" style="display:inline">
            @csrf
            <button type="submit">Approve</button>
        </form>
        <form action="{{ route('admin.properties.publish', $property['id']) }}" method="POST" style="display:inline">
            @csrf
            <button type="submit">Publish</button>
        </form>
        <form action="{{ route('admin.properties.reject', $property['id']) }}" method="POST" style="display:inline">
            @csrf
            <input type="text" name="reason" placeholder="Rejection reason" required>
            <button type="submit">Reject</button>
        </form>
    </div>
@endforeach

<h2>Universities awaiting verification</h2>
@foreach($universityVerificationQueue as $uni)
    <div>
        <p>{{ $uni['officialName'] }}</p>
        <form action="{{ route('admin.universities.verify', $uni['id']) }}" method="POST" style="display:inline">
            @csrf
            <button type="submit">Verify</button>
        </form>
        <form action="{{ route('admin.universities.reject', $uni['id']) }}" method="POST" style="display:inline">
            @csrf
            <input type="text" name="reason" placeholder="Rejection reason" required>
            <button type="submit">Reject</button>
        </form>
    </div>
@endforeach
@endsection
