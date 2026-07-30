@extends('layouts.app')
@section('content')
<h1>Blog</h1>
@if(count($posts) === 0)
    <p>No posts published yet.</p>
@else
    <ul>
        @foreach($posts as $post)
            <li>
                <a href="{{ route('blog.show', $post['slug']) }}">{{ $post['title'] }}</a>
                <p>{{ $post['excerpt'] }}</p>
            </li>
        @endforeach
    </ul>
@endif
@endsection
