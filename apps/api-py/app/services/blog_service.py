"""Direct port of blog/blog.service.ts."""

import re
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import BlogPost


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


async def list_published(db: AsyncSession) -> list[BlogPost]:
    result = await db.execute(
        select(BlogPost).where(BlogPost.publication_status == "PUBLISHED").order_by(BlogPost.published_at.desc())
    )
    return list(result.scalars().all())


async def get_published_by_slug(db: AsyncSession, slug: str) -> BlogPost:
    post = (await db.execute(select(BlogPost).where(BlogPost.slug == slug))).scalar_one_or_none()
    if post is None or post.publication_status != "PUBLISHED":
        raise HTTPException(status_code=404, detail="Post not found or not yet published.")
    return post


async def list_all_for_admin(db: AsyncSession) -> list[BlogPost]:
    result = await db.execute(select(BlogPost).order_by(BlogPost.created_at.desc()))
    return list(result.scalars().all())


async def create(db: AsyncSession, title: str, excerpt: str, body: str, author_name: str, category: str | None, cover_image_url: str | None) -> BlogPost:
    slug_base = _slugify(title)
    slug = slug_base
    if (await db.execute(select(BlogPost).where(BlogPost.slug == slug))).scalar_one_or_none():
        slug = f"{slug_base}-{uuid.uuid4().hex[:6]}"

    post = BlogPost(
        title=title, slug=slug, excerpt=excerpt, body=body, author_name=author_name,
        category=category, cover_image_url=cover_image_url, publication_status="DRAFT",
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post


async def _get_by_id_or_throw(db: AsyncSession, post_id: str) -> BlogPost:
    post = (await db.execute(select(BlogPost).where(BlogPost.id == post_id))).scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=404, detail="Blog post not found.")
    return post


async def update(db: AsyncSession, post_id: str, updates: dict) -> BlogPost:
    post = await _get_by_id_or_throw(db, post_id)
    for field, value in updates.items():
        if value is not None:
            setattr(post, field, value)
    await db.commit()
    await db.refresh(post)
    return post


async def publish(db: AsyncSession, post_id: str) -> BlogPost:
    post = await _get_by_id_or_throw(db, post_id)
    post.publication_status = "PUBLISHED"
    post.published_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(post)
    return post


async def unpublish(db: AsyncSession, post_id: str) -> BlogPost:
    post = await _get_by_id_or_throw(db, post_id)
    post.publication_status = "DRAFT"
    post.published_at = None
    await db.commit()
    await db.refresh(post)
    return post
