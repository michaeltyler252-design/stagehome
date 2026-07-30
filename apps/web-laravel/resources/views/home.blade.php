@extends('layouts.app')
@section('content')
<h1>Find verified student housing near your university</h1>
<section>
    <h2>Universities</h2>
    <ul>
        @foreach($universities as $u)
            <li><a href="{{ route('universities.show', $u['slug']) }}">{{ $u['officialName'] }}</a></li>
        @endforeach
    </ul>
</section>
<section>
    <h2>From the blog</h2>
    <ul>
        @foreach($blogPosts as $post)
            <li><a href="{{ route('blog.show', $post['slug']) }}">{{ $post['title'] }}</a></li>
        @endforeach
    </ul>
</section>
@endsection
