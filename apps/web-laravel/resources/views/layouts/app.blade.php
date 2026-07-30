<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>@yield('title', 'StageHome — Verified Student Housing in Kenya')</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <header>
        <nav>
            <a href="{{ route('home') }}">StageHome</a>
            <a href="{{ route('universities.index') }}">Universities</a>
            <a href="{{ route('counties.index') }}">Counties</a>
            <a href="{{ route('search') }}">Search</a>
            <a href="{{ route('blog.index') }}">Blog</a>
            @if(session('access_token'))
                <a href="{{ route('dashboard') }}">My Dashboard</a>
                <form action="{{ route('logout') }}" method="POST" style="display:inline">
                    @csrf
                    <button type="submit">Sign out</button>
                </form>
            @else
                <a href="{{ route('login') }}">Sign in</a>
                <a href="{{ route('register') }}">Create account</a>
            @endif
        </nav>
    </header>

    <main>
        @yield('content')
    </main>

    <footer>
        <p>StageHome — Verified student accommodation near Kenyan universities.</p>
    </footer>
</body>
</html>
