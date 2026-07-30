"""
FastAPI dependencies replacing Nest's JwtAuthGuard / RolesGuard / @CurrentUser().
"""

from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import JWTError, verify_access_token

_bearer = HTTPBearer(auto_error=False)


@dataclass
class AuthenticatedUser:
    """Mirrors apps/api/src/common/decorators/current-user.decorator.ts's
    AuthenticatedUser interface exactly."""

    user_id: str
    email: str | None
    roles: list[str]
    organisation_id: str | None = None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthenticatedUser:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = verify_access_token(credentials.credentials)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    return AuthenticatedUser(
        user_id=payload["sub"],
        email=payload.get("email"),
        roles=payload.get("roles", []),
        organisation_id=payload.get("organisationId"),
    )


def require_roles(*allowed_roles: str):
    """Dependency factory mirroring @Roles(...) + RolesGuard — usage:
    Depends(require_roles("Admin"))."""

    def _check(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if not any(role in user.roles for role in allowed_roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return _check
