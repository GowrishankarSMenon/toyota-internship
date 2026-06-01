import asyncio
import os
import sys
from logging.config import fileConfig
from dotenv import load_dotenv
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

# Add the backend directory to the Python path so Alembic can find the 'app' module
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Load the .env file securely
load_dotenv()

# Import your SQLAlchemy Base models
from app.models import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# ALWAYS use the direct session port (5432) for Alembic on Supabase
migration_url = os.getenv("DATABASE_URL_MIGRATION")

if not migration_url:
    raise ValueError("DATABASE_URL_MIGRATION is missing. Check your .env file.")

# Escape the '%' sign so Python's configparser doesn't crash on encoded passwords
escaped_url = migration_url.replace("%", "%%")
config.set_main_option("sqlalchemy.url", escaped_url)

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()