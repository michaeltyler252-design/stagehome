@extends('layouts.app')
@section('content')
<h1>Find verified student housing near your university</h1>
<section>
    <h2>Universities</h2>
    <ul>
        @foreach($universities as $u)
            @continue(!is_array($u))
            <li><a href="{{ route('universities.show', $u['slug'] ?? '') }}">{{ $u['officialName'] ?? 'Unnamed university' }}</a></li>
        @endforeach
    </ul>
</section>
<section>
    <h2>From the blog</h2>
    <ul>
        @foreach($blogPosts as $post)
            @continue(!is_array($post))
            <li><a href="{{ route('blog.show', $post['slug'] ?? '') }}">{{ $post['title'] ?? 'Untitled post' }}</a></li>
        @endforeach
    </ul>
</section>
@endsection
