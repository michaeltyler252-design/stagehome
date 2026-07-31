<?php

namespace App\Http\Controllers;

use App\Services\StageHomeApiClient;
use Illuminate\Http\Request;

class PublicController extends Controller
{
    public function __construct(private StageHomeApiClient $api) {}

    public function home()
    {
        try {
            $universities = $this->api->listUniversities();
            $universities = is_array($universities) ? $universities : [];
        } catch (\Throwable $e) {
            \Log::error('Failed to load universities for homepage: '.$e->getMessage());
            $universities = [];
        }

        try {
            $blogPosts = $this->api->listBlogPosts();
            $blogPosts = is_array($blogPosts) ? $blogPosts : [];
        } catch (\Throwable $e) {
            \Log::error('Failed to load blog posts for homepage: '.$e->getMessage());
            $blogPosts = [];
        }

        return view('home', [
            'universities' => $universities,
            'blogPosts' => $blogPosts,
        ]);
    }

    public function counties()
    {
        return view('counties.index', ['counties' => $this->api->listCounties()]);
    }

    public function countyShow(string $slug)
    {
        $county = $this->api->getCounty($slug);
        abort_if($county === null, 404);

        return view('counties.show', [
            'county' => $county,
            'universities' => $this->api->listUniversities($slug),
            'search' => $this->api->searchProperties(['countySlug' => $slug, 'limit' => 12]),
        ]);
    }

    public function universities()
    {
        return view('universities.index', ['universities' => $this->api->listUniversities()]);
    }

    public function universityShow(string $slug)
    {
        $university = $this->api->getUniversity($slug);
        abort_if($university === null, 404);

        return view('universities.show', ['university' => $university]);
    }

    public function search(Request $request)
    {
        $params = $request->only(['countySlug', 'categoryKey', 'keyword', 'lat', 'lng', 'radiusKm', 'sort', 'page']);
        return view('properties.search', [
            'search' => $this->api->searchProperties(array_filter($params)),
            'filters' => $params,
        ]);
    }

    public function propertyShow(string $slug)
    {
        $property = $this->api->getProperty($slug);
        abort_if($property === null, 404);

        return view('properties.show', ['property' => $property]);
    }

    public function blogIndex()
    {
        return view('blog.index', ['posts' => $this->api->listBlogPosts()]);
    }

    public function blogShow(string $slug)
    {
        $post = $this->api->getBlogPost($slug);
        abort_if($post === null, 404);

        return view('blog.show', ['post' => $post]);
    }
}
