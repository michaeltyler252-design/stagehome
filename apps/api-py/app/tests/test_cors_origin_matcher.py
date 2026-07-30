from app.core.cors_origin_matcher import is_allowed_origin

EXPLICIT_ORIGINS = ["https://stagehome-web.vercel.app", "http://localhost:3000"]


def test_allows_an_origin_explicitly_in_web_app_origin():
    assert is_allowed_origin("https://stagehome-web.vercel.app", EXPLICIT_ORIGINS)
    assert is_allowed_origin("http://localhost:3000", EXPLICIT_ORIGINS)


def test_allows_any_stagehome_vercel_app_origin_even_if_not_explicitly_listed():
    assert is_allowed_origin("https://stagehome-hqv2qor30-edward-bce1.vercel.app", EXPLICIT_ORIGINS)
    assert is_allowed_origin(
        "https://stagehome-kenyan-student-housing-ma-omega.vercel.app", EXPLICIT_ORIGINS
    )
    assert is_allowed_origin("https://stagehomeanything.vercel.app", EXPLICIT_ORIGINS)


def test_does_not_allow_an_unrelated_vercel_app_origin():
    assert not is_allowed_origin("https://someone-elses-app.vercel.app", EXPLICIT_ORIGINS)


def test_does_not_allow_a_random_non_vercel_origin():
    assert not is_allowed_origin("https://evil.example.com", EXPLICIT_ORIGINS)


def test_does_not_allow_http_even_for_a_stagehome_prefixed_vercel_origin():
    assert not is_allowed_origin("http://stagehome-web.vercel.app", EXPLICIT_ORIGINS)
