from contextlib import asynccontextmanager
import ssl
from typing import AsyncGenerator, Optional
from uuid import uuid4

from configuration.logger.config import log
from configuration.settings import Settings
from sqlalchemy.engine import URL

from sqlalchemy.ext.asyncio import (  # isort: skip
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


class Database:
    _engine = None
    _sessionmaker: Optional[async_sessionmaker] = None

    @staticmethod
    def _is_ssl_enabled(ssl_mode: str | None) -> bool:
        return str(ssl_mode or "").strip().lower() in {
            "1",
            "true",
            "require",
            "verify-ca",
            "verify-full",
        }

    @staticmethod
    def _sync_ssl_query(ssl_mode: str | None) -> dict[str, str]:
        normalized = str(ssl_mode or "").strip().lower()
        if not Database._is_ssl_enabled(normalized):
            return {}
        if normalized in {"1", "true"}:
            normalized = "require"
        return {"sslmode": normalized}

    @staticmethod
    def _async_connect_args(ssl_mode: str | None) -> dict[str, object]:
        connect_args: dict[str, object] = {
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
            "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4().hex}__",
        }
        normalized = str(ssl_mode or "").strip().lower()
        if not Database._is_ssl_enabled(normalized):
            return connect_args
        if normalized in {"1", "true", "require"}:
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            connect_args["ssl"] = ssl_context
            return connect_args
        connect_args["ssl"] = ssl.create_default_context()
        return connect_args

    @classmethod
    def get_url(cls):
        settings = Settings()
        return URL.create(
            drivername="postgresql+asyncpg",
            username=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            host=settings.POSTGRES_SERVER,
            port=settings.POSTGRES_PORT,
            database=settings.POSTGRES_DB,
            query={"prepared_statement_cache_size": "0"},
        )

    @classmethod
    def get_sync_url(cls):
        settings = Settings()
        return URL.create(
            drivername="postgresql",
            username=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            host=settings.POSTGRES_SERVER,
            port=settings.POSTGRES_PORT,
            database=settings.POSTGRES_DB,
            query=cls._sync_ssl_query(settings.POSTGRES_SSL_MODE),
        ).render_as_string(hide_password=False)

    @classmethod
    def get_async_engine(cls):
        settings = Settings()
        if cls._engine is None:
            cls._engine = create_async_engine(
                cls.get_url(),
                echo=settings.DB_ECHO,
                future=True,
                pool_pre_ping=True,
                hide_parameters=True,
                connect_args=cls._async_connect_args(settings.POSTGRES_SSL_MODE),
            )
        return cls._engine

    @classmethod
    def get_sessionmaker(cls) -> async_sessionmaker:
        if cls._sessionmaker is None:
            engine = cls.get_async_engine()
            cls._sessionmaker = async_sessionmaker(
                bind=engine, expire_on_commit=False, autoflush=False
            )
        return cls._sessionmaker

    @classmethod
    async def get_async_db_session(cls) -> AsyncGenerator[AsyncSession, None]:
        session_maker = cls.get_sessionmaker()
        async_session: AsyncSession = session_maker()
        try:
            yield async_session
        except Exception as e:
            log.error(f"Error in database session: {e}")
            raise e
        finally:
            await async_session.close()  # noqa: ASYNC102

    @classmethod
    @asynccontextmanager
    async def get_instance_db(cls) -> AsyncSession:
        session_maker = cls.get_sessionmaker()
        async with session_maker() as session:
            yield session


class DatabaseReadOnly:
    _engine = None
    _sessionmaker: Optional[async_sessionmaker] = None

    @classmethod
    def get_url(cls):
        settings = Settings()
        return URL.create(
            drivername="postgresql+asyncpg",
            username=settings.READ_ONLY_POSTGRES_USER,
            password=settings.READ_ONLY_POSTGRES_PASSWORD,
            host=settings.READ_ONLY_POSTGRES_SERVER,
            port=settings.READ_ONLY_POSTGRES_PORT,
            database=settings.READ_ONLY_POSTGRES_DB,
            query={"prepared_statement_cache_size": "0"},
        )

    @classmethod
    def get_async_engine(cls):
        settings = Settings()
        if cls._engine is None:
            cls._engine = create_async_engine(
                cls.get_url(),
                echo=settings.DB_ECHO,
                future=True,
                pool_pre_ping=True,
                hide_parameters=True,
                connect_args=Database._async_connect_args(
                    settings.READ_ONLY_POSTGRES_SSL_MODE
                ),
            )
        return cls._engine

    @classmethod
    def get_sessionmaker(cls) -> async_sessionmaker:
        if cls._sessionmaker is None:
            engine = cls.get_async_engine()
            cls._sessionmaker = async_sessionmaker(
                bind=engine, expire_on_commit=False, autoflush=False
            )

        return cls._sessionmaker

    @classmethod
    def get_instance_db(cls) -> AsyncSession:
        async_session = cls.get_sessionmaker()
        return async_session
