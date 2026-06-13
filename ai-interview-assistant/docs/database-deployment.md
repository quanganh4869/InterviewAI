# Database deployment

The application stores business data in PostgreSQL through SQLAlchemy and Alembic.
Supabase is the hosted PostgreSQL target for deployment. pgAdmin is only a database
administration UI; it does not store application data by itself.

## What is stored in PostgreSQL

- Users and auth identities
- Uploaded document records such as CV/JD metadata
- CV/JD analysis history
- Any future job posting/application tables

Uploaded file bytes are still controlled by `STORAGE_STRATEGY`:

- `local`: files are stored under `UPLOAD_DIR`
- `r2`: files are stored in Cloudflare R2

For deployment, use R2 or another persistent object storage. Do not rely on local
container storage for uploaded files.

## Local development

Use the default Docker PostgreSQL and pgAdmin:

```bash
docker compose up -d database backend frontend pgadmin
```

Open pgAdmin at:

```text
http://localhost:5050
```

Default pgAdmin login comes from `.env` or `.env.example`:

```text
PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=admin123456
```

To connect pgAdmin to the local Docker database:

```text
Host: database
Port: 5432
Database: AIinterview
Username: postgres
Password: 123456
```

## Supabase PostgreSQL

In Supabase, open:

```text
Project Settings -> Database -> Connection string
```

For most hosted deployments, use the transaction pooler values:

```text
POSTGRES_SERVER=<pooler-host>
POSTGRES_PORT=6543
POSTGRES_DB=postgres
POSTGRES_USER=postgres.<project-ref>
POSTGRES_PASSWORD=<database-password>
POSTGRES_SSL_MODE=require
```

Mirror the same values for read-only settings unless you create a separate
read-only database role:

```text
READ_ONLY_POSTGRES_SERVER=<pooler-host>
READ_ONLY_POSTGRES_PORT=6543
READ_ONLY_POSTGRES_DB=postgres
READ_ONLY_POSTGRES_USER=postgres.<project-ref>
READ_ONLY_POSTGRES_PASSWORD=<database-password>
READ_ONLY_POSTGRES_SSL_MODE=require
```

The backend container runs migrations before starting:

```text
alembic -c /app/alembic.ini upgrade head
```

That means the Supabase database will receive the same schema as the local
PostgreSQL database when the backend boots with Supabase credentials.

## Connecting pgAdmin to Supabase

Create a new pgAdmin server entry:

```text
Host: <Supabase pooler/direct host>
Port: 6543 or 5432
Maintenance database: postgres
Username: postgres.<project-ref> for pooler, or postgres for direct connection
Password: <database-password>
SSL mode: Require
```

If a direct connection fails from your network or hosting provider, use the
Supabase pooler connection.
