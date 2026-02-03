from fastapi import APIRouter

from api.dependencies import auth

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/authenticate", operation_id="authenticate_user")
async def authenticate_user(username, password) -> dict:
    """Endpoint to test Keycloak connection and authenticate a user."""
    try:
        token = auth.authenticate_user(username, password)
        
        return {"status": "success", "token": token}
    except Exception as e:
        return {"status": "failure", "error": str(e)}
