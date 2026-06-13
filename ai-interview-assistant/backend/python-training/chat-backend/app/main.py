from contextlib import asynccontextmanager
from pathlib import Path  # noqa: E402

from api.routes import router
from configuration.logger.config import log
from configuration.middleware.jwt_auth_middleware import JWTAuthMiddleware
from configuration.settings import configuration
from db.db_connection import Database
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from starlette.middleware.authentication import AuthenticationMiddleware
from starlette_context.middleware import RawContextMiddleware


def create_app(skip_auth: bool = False) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # startup logic
        # add more startup logic here

        # check database connection
        session = Database.get_sessionmaker()
        try:
            async with session() as conn:
                await conn.execute(text("SELECT 1"))
            log.info("✅ Database connected successfully")
        except Exception as e:
            log.error(f"❌ Database connection failed: {e}")
            raise e

        # Check AI keys configuration
        if configuration.OPENAI_API_KEY:
            log.info("⚡ [PRODUCTION AI] OpenAI API configured. Real GPT scoring and Whisper transcription are ACTIVE.")
        elif configuration.GEMINI_API_KEY:
            log.info("⚡ [PRODUCTION AI] Gemini API configured. Real Gemini scoring, evaluation and transcription are ACTIVE.")
        else:
            log.warning("⚠️ [MOCK MODE] Neither OPENAI_API_KEY nor GEMINI_API_KEY is set. System will fallback to Mock provider.")

        log.info("Application startup complete.")
        yield

    configuration.JWT_RSA_PRIVATE_KEY = load_rsa_private_key()
    if not configuration.JWT_RSA_PRIVATE_KEY:
        log.error("❌ Error load RSA private key")
        raise Exception("Error load RSA private key")

    app = FastAPI(
        lifespan=lifespan,
        dependencies=[],
    )
    app.include_router(router)
    register_middlewares(app)

    return app


def register_middlewares(app: FastAPI):
    env = configuration.ENVIRONMENT
    if env in ["production", "staging"]:
        # TODO: add security middlewares
        pass

    # CORS must handle browser preflight (OPTIONS) before route/auth checks.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=configuration.BACKEND_CORS_ORIGINS,
        allow_methods=configuration.BACKEND_CORS_METHODS,
        allow_headers=["*"],
        expose_headers=["*"],
    )

    app.add_middleware(
        AuthenticationMiddleware,
        backend=JWTAuthMiddleware(),
        on_error=JWTAuthMiddleware.auth_exception_handler,
    )

    app.add_middleware(RawContextMiddleware)


def load_rsa_private_key() -> bytes:
    base_dir = Path(__file__).resolve().parent
    current_kid = configuration.RSA_KEY_MANIFEST.get("current_kid")
    rsa_path = base_dir / configuration.RSA_KEY_MANIFEST.get("keys").get(
        current_kid
    ).get("private_path")
    with open(rsa_path, "rb") as f:
        return f.read()


app = create_app(skip_auth=False)
