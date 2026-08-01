@extends('layouts.app')
@section('content')
<h1>Universities</h1>
<ul>
    @foreach($universities as $u)
        @continue(!is_array($u))
        <li><a href="{{ route('universities.show', $u['slug'] ?? '') }}">{{ $u['officialName'] ?? 'Unnamed university' }}</a></li>
    @endforeach
</ul>
@endsection
