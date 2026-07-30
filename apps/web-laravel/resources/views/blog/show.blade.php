@extends('layouts.app')
@section('content')
<article>
    <h1>{{ $post['title'] }}</h1>
    <p>By {{ $post['authorName'] }}</p>
    <div>{!! nl2br(e($post['body'])) !!}</div>
</article>
@endsection
