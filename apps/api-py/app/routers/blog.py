"""Direct port of blog/blog.controller.ts."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.services import blog_service

router = APIRouter(tags=["blog"])


class CreateBlogPostRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=3)
    excerpt: str = Field(min_length=10)
    body: str = Field(min_length=20)
    author_name: str
    category: str | None = None
    cover_image_url: str | None = None


class UpdateBlogPostRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str | None = None
    excerpt: str | None = None
    body: str | None = None
    author_name: str | None = None
    category: str | None = None
    cover_image_url: str | None = None


def _serialize_summary(p):
    return {
        "id": p.id, "title": p.title, "slug": p.slug, "excerpt": p.excerpt,
        "coverImageUrl": p.cover_image_url, "authorName": p.author_name,
        "category": p.category, "publishedAt": p.published_at,
    }


def _serialize_full(p):
    return {**_serialize_summary(p), "body": p.body, "publicationStatus": p.publication_status, "createdAt": p.created_at}


@router.get("/public/blog")
async def list_published(db: AsyncSession = Depends(get_db)):
    posts = await blog_service.list_published(db)
    return [_serialize_summary(p) for p in posts]


@router.get("/public/blog/{slug}")
async def get_published_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    post = await blog_service.get_published_by_slug(db, slug)
    return _serialize_full(post)


@router.get("/admin/blog", dependencies=[Depends(require_roles("Admin"))])
async def list_all_for_admin(db: AsyncSession = Depends(get_db)):
    posts = await blog_service.list_all_for_admin(db)
    return [_serialize_full(p) for p in posts]


@router.post("/admin/blog", status_code=201, dependencies=[Depends(require_roles("Admin"))])
async def create(body: CreateBlogPostRequest, db: AsyncSession = Depends(get_db)):
    post = await blog_service.create(db, body.title, body.excerpt, body.body, body.author_name, body.category, body.cover_image_url)
    return _serialize_full(post)


@router.patch("/admin/blog/{post_id}", dependencies=[Depends(require_roles("Admin"))])
async def update(post_id: str, body: UpdateBlogPostRequest, db: AsyncSession = Depends(get_db)):
    post = await blog_service.update(db, post_id, body.model_dump())
    return _serialize_full(post)


@router.post("/admin/blog/{post_id}/publish", dependencies=[Depends(require_roles("Admin"))])
async def publish(post_id: str, db: AsyncSession = Depends(get_db)):
    post = await blog_service.publish(db, post_id)
    return _serialize_full(post)


@router.post("/admin/blog/{post_id}/unpublish", dependencies=[Depends(require_roles("Admin"))])
async def unpublish(post_id: str, db: AsyncSession = Depends(get_db)):
    post = await blog_service.unpublish(db, post_id)
    return _serialize_full(post)
