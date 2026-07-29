import type { MetadataRoute } from "next";
import { apiClient } from "../lib/api-client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/counties`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/universities`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/how-it-works`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/privacy-policy`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/cookie-policy`, changeFrequency: "yearly", priority: 0.1 },
  ];

  const [counties, universities, propertySearch, blogPosts] = await Promise.all([
    apiClient.listCounties().catch(() => []),
    apiClient.listUniversities().catch(() => []),
    apiClient.searchProperties({ limit: 100 }).catch(() => ({ results: [], pagination: { totalPages: 1 } })),
    apiClient.listBlogPosts().catch(() => []),
  ]);

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post: any) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  const propertyRoutes: MetadataRoute.Sitemap = propertySearch.results.map((p) => ({
    url: `${SITE_URL}/properties/${p.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const countyRoutes: MetadataRoute.Sitemap = counties.map((c) => ({
    url: `${SITE_URL}/counties/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // Part L: "noindex for thin combinations" — only include universities whose
  // verification has actually started, mirroring PublicController's own scope.
  const universityRoutes: MetadataRoute.Sitemap = universities
    .filter((u) => u.verificationStatus !== "UNVERIFIED")
    .map((u) => ({
      url: `${SITE_URL}/universities/${u.slug}`,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  return [...staticRoutes, ...countyRoutes, ...universityRoutes, ...propertyRoutes, ...blogRoutes];
}
