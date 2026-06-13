import logging
import traceback
from fastapi import Request, status
from fastapi.responses import JSONResponse

log = logging.getLogger(__name__)

async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler to ensure all errors are returned in a consistent JSON format.
    """
    log.error(f"Unhandled error occurred: {exc}")
    log.error(traceback.format_exc())
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": str(exc),
            "path": request.url.path
        },
    )

async def http_exception_handler(request: Request, exc):
    """
    Handler for specific FastAPI HTTPExceptions.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "Request Error",
            "detail": exc.detail,
            "path": request.url.path
        },
    )
