@extends('layouts.app')
@section('content')
<h1>{{ $university['officialName'] }}</h1>
<p>Type: {{ $university['type'] ?? 'Information Required' }}</p>
<p>Status: {{ $university['verificationStatus'] }}</p>
@endsection
