@extends('layouts.app')
@section('content')
<h1>Admin Dashboard</h1>
<p>Total users: {{ $dashboard['totalUsers'] ?? 0 }}</p>
<p>Total revenue: KES {{ $dashboard['totalRevenue'] ?? 0 }}</p>
<p>Verification queue: {{ $dashboard['verificationQueueCount'] ?? 0 }}</p>
<p>Flagged conflicts: {{ $dashboard['flaggedConflicts'] ?? 0 }}</p>
<p>Refunds pending dual control: {{ $dashboard['refundsPendingDualControl'] ?? 0 }}</p>
<a href="{{ route('admin.verification') }}">Go to verification queue</a>
@endsection
