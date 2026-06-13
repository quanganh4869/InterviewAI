import logging
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.exceptions import global_exception_handler, http_exception_handler

# Setup Logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
log = logging.getLogger("app")

def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.APP_NAME,
        debug=settings.DEBUG,
        version="1.0.0"
    )

    # Set up CORS
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, specify actual origins
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register Exception Handlers
    application.add_exception_handler(Exception, global_exception_handler)
    application.add_exception_handler(HTTPException, http_exception_handler)

    # Include API Routers
    application.include_router(api_router, prefix=settings.API_V1_STR)

    @application.get("/", tags=["Health"])
    async def root():
        return {
            "status": "healthy",
            "app_name": settings.APP_NAME,
            "version": "1.0.0",
            "docs": "/docs"
        }

    return application

app = create_application()

if __name__ == "__main__":
    log.info(f"Starting {settings.APP_NAME}...")
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8001, 
        reload=settings.DEBUG
    )
