@extends('layouts.app')
@section('content')
<h1>Universities</h1>
<ul>
    @foreach($universities as $u)
        <li><a href="{{ route('universities.show', $u['slug']) }}">{{ $u['officialName'] }}</a></li>
    @endforeach
</ul>
@endsection
