import type { Metadata } from "next";
import Link from "next/link";
import { apiClient } from "../../lib/api-client";
import { EmptyState } from "../../components/EmptyState";
import { canonicalUrl } from "../../lib/seo";

export const metadata: Metadata = {
  title: "Blog — Renting tips & student housing guides",
  description: "Renting tips, student housing guides, moving guides, and tenant rights for Kenyan students.",
  alternates: { canonical: canonicalUrl("/blog") },
};

export default async function BlogIndexPage() {
  const posts = await apiClient.listBlogPosts().catch(() => []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="route-headline text-4xl">Blog</h1>
      <p className="mt-2 max-w-xl text-chalk/70">
        Renting tips, student housing guides, moving guides, and tenant rights for students
        renting in Kenya.
      </p>

      {posts.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No posts published yet"
            description="Check back soon — new renting tips and guides are added regularly."
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post: any) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="ticket-card block overflow-hidden p-0 hover:shadow-md"
            >
              {post.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.coverImageUrl}
                  alt=""
                  className="aspect-[16/9] w-full object-cover"
                />
              ) : null}
              <div className="p-5">
                {post.category ? (
                  <p className="font-mono text-xs uppercase tracking-widest text-chalk/50">
                    {post.category}
                  </p>
                ) : null}
                <p className="mt-1 font-display text-xl">{post.title}</p>
                <p className="mt-2 text-sm text-chalk/70">{post.excerpt}</p>
                <p className="mt-3 text-xs text-chalk/50">By {post.authorName}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
