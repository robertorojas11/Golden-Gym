# Skill: Offline-First Operation
This skill outlines how the system runs completely on-premise without connection to the internet.

---

## 1. Purpose
Gym operations must continue even during local ISP outages. Access control validation, member signups, and payments must be processed directly on the gym's on-premise server.

## 2. Business Rules
1. **Local Network Isolation**:
   - The application does not rely on third-party CDNs, external web API verification, or external DNS resolution for core operation.
   - All modules, front-end dependencies, libraries, fonts, and assets are hosted locally inside the container network.
2. **Local Database Sovereignty**:
   - The on-premise PostgreSQL container holds the source of truth database.
   - Automatic database backups are written directly to local docker volume locations for easy data extraction.

## 3. Data Flow
1. Client requests (from reception terminals or access control screens) are routed through the local router to the server IP.
2. The Nginx container proxy requests to backend/frontend containers.
3. If an internet connection is established in the future, a sync queue can be activated to synchronize local table changes with a cloud-based central administration panel.

## 4. UI Expectations
- A status indicator in the global header displaying "Local Mode" or "Offline-First Status".
- Database backup widgets letting owners trigger instant offline exports (SQL dumps).

## 5. Future Expansion
- Database replication using tools like PostgreSQL logical replication to sync data with a central cloud instance for multi-gym setups.
