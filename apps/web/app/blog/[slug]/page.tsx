import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiClient } from "../../../lib/api-client";
import { JsonLd } from "../../../components/JsonLd";
import { canonicalUrl, breadcrumbJsonLd } from "../../../lib/seo";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const post = await apiClient.getBlogPost(params.slug);
    return {
      title: post.title,
      description: post.excerpt,
      alternates: { canonical: canonicalUrl(`/blog/${params.slug}`) },
      openGraph: {
        title: post.title,
        description: post.excerpt,
        images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
      },
    };
  } catch {
    return { title: "Post not found" };
  }
}

export default async function BlogPostPage({ params }: Props) {
  const post = await apiClient.getBlogPost(params.slug).catch(() => null);
  if (!post) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${params.slug}` },
        ])}
      />
      {post.category ? (
        <p className="font-mono text-xs uppercase tracking-widest text-chalk/50">{post.category}</p>
      ) : null}
      <h1 className="route-headline mt-2 text-4xl">{post.title}</h1>
      <p className="mt-2 text-sm text-chalk/50">
        By {post.authorName}
        {post.publishedAt ? ` · ${new Date(post.publishedAt).toLocaleDateString()}` : ""}
      </p>

      {post.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt=""
          className="mt-6 aspect-[16/9] w-full rounded-ticket object-cover"
        />
      ) : null}

      <div className="mt-8 space-y-4 whitespace-pre-line text-chalk/80">{post.body}</div>
    </div>
  );
}
