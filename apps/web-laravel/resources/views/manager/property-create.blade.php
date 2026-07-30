@extends('layouts.app')
@section('content')
<h1>Add a property</h1>
@if($errors->any())
    @foreach($errors->all() as $error)<p>{{ $error }}</p>@endforeach
@endif
<form action="{{ route('manager.properties.store', $organisationId) }}" method="POST">
    @csrf
    <label>Title <input type="text" name="title" minlength="3" required></label>
    <label>County ID <input type="text" name="county_id" required></label>
    <label>Description <textarea name="description"></textarea></label>
    <label>Address <input type="text" name="address"></label>
    <button type="submit">Create property (draft)</button>
</form>
@endsection
