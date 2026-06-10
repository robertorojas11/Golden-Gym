# Deployment Rules - Gym Access Control System (v1)

This document outlines deployment configurations, container structures, and hardware integration guidelines.

---

## 1. Container Architecture

1. **Service Boundaries**: The system consists of 4 distinct services orchestrated via `docker-compose.yml`:
   - `postgres`: Persistent database container.
   - `backend`: NestJS application container.
   - `frontend`: Static frontend build served via Nginx OR run locally in dev mode.
   - `nginx`: Revese proxy container routing external requests to frontend and backend services.
2. **Port Mappings**:
   - `nginx` exposes port `80` (and `443` if configured with local certs) to the local area network (LAN).
   - `backend` runs internally on port `3000`.
   - `postgres` runs internally on port `5432`. Its port must not be exposed outside the Docker network in production, but can be exposed for development tooling.

---

## 2. Volume Persistence

1. **Database Persistence**: The Postgres container must mount a volume `postgres_data` pointing to `/var/lib/postgresql/data` to ensure zero data loss during container rebuilds.
2. **Media and Backups**: Member photo uploads and database backups must be written to named host volumes (e.g., `member_photos:/app/uploads`).

---

## 3. Configuration Management

1. **Environment Separation**: Maintain a `.env` template that defines key parameters:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - `JWT_SECRET`
   - `BIOMETRIC_SCAN_PORT`
2. **Auto-Restart Policy**: Ensure all containers are configured with `restart: always` or `restart: unless-stopped` to handle local power grid failures at the gym.
