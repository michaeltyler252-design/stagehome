"""Direct port of support/support.controller.ts."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AuthenticatedUser, get_current_user, require_roles
from app.services import support_service

router = APIRouter(prefix="/support/tickets", tags=["support"])


class CreateTicketRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    subject: str
    body: str
    priority: str | None = None


class AddMessageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    body: str


class UpdateStatusRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str


def _serialize_ticket(t):
    return {"id": t.id, "userId": t.user_id, "subject": t.subject, "priority": t.priority, "status": t.status, "createdAt": t.created_at}


@router.post("", status_code=201)
async def create(body: CreateTicketRequest, user: AuthenticatedUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ticket = await support_service.create_ticket(db, user, body.subject, body.body, body.priority)
    return _serialize_ticket(ticket)


@router.get("/mine")
async def list_mine(user: AuthenticatedUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tickets = await support_service.list_mine(db, user.user_id)
    return [_serialize_ticket(t) for t in tickets]


@router.post("/{ticket_id}/messages", status_code=201)
async def add_message(
    ticket_id: str, body: AddMessageRequest,
    user: AuthenticatedUser = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    message = await support_service.add_message(db, user, ticket_id, body.body)
    return {"id": message.id, "ticketId": message.ticket_id, "body": message.body, "createdAt": message.created_at}


@router.get("/all", dependencies=[Depends(require_roles("Admin", "Receptionist"))])
async def list_all(db: AsyncSession = Depends(get_db)):
    tickets = await support_service.list_all(db)
    return [_serialize_ticket(t) for t in tickets]


@router.patch("/{ticket_id}/status", dependencies=[Depends(require_roles("Admin", "Receptionist"))])
async def update_status(ticket_id: str, body: UpdateStatusRequest, db: AsyncSession = Depends(get_db)):
    ticket = await support_service.update_status(db, ticket_id, body.status)
    return _serialize_ticket(ticket)
