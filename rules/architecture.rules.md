# Architecture Rules - Gym Access Control System (v1)

This document establishes the architecture rules for the Gym Access Control System. It guarantees clean, scalable, on-premise, and offline-first software design.

---

## 1. System Topology (On-Premise Monolith)

1. **Deployment Unit**: The entire application runs as a Dockerized monolith containing a NestJS backend, a PostgreSQL database, an Nginx reverse proxy, and a Vue 3 frontend.
2. **On-Premise Host**: The system runs locally on the gym's reception desktop (acting as the server). It must run without external internet dependencies.
3. **Hardware Boundaries**: Biometric reader hardware (e.g., USB fingerprint scanner) interacts with the system through local host ports mapped to the container or via an on-premise daemon. The web application calls a standardized loopback interface or simulated endpoints.

---

## 2. Backend Architecture (NestJS)

1. **Modular Design**: Code must be separated into cohesive modules representing bounded domains:
   - `auth`: Authentication and RBAC
   - `users`: Staff accounts
   - `members`: Gym members, profiles, and notes
   - `memberships`: Membership definitions, history, and status
   - `payments`: Transactions, payment methods, and refunds
   - `biometrics`: Fingerprint matching logic and simulation
   - `access-control`: Check-in validation and logging
   - `analytics`: Reports and aggregations
2. **Controller-Service-Repository Pattern**:
   - **Controllers**: Handle HTTP requests, DTO validations, and route formatting.
   - **Services**: Contain pure business logic and coordinate domain operations.
   - **Repositories**: Execute database queries using TypeORM or raw SQL queries with standard transaction controls.
3. **Dependency Injection**: Use NestJS DI. Direct instantiation of service and repository classes is strictly forbidden outside tests.
4. **Data Transfer Objects (DTOs)**: Every request payload must be validated using `class-validator` and `class-transformer` properties.

---

## 3. Frontend Architecture (Vue 3 + Pinia)

1. **State Management**: All persistent domain states must be managed through Pinia stores:
   - `auth.store.ts`: Current user credentials and token.
   - `member.store.ts`: Selected member, search lists, and profiles.
   - `biometric.store.ts`: Current scanner state, active validations, and check-in logs.
   - `dashboard.store.ts`: Analytics widgets and charts status.
2. **Router Control**: Route guards must enforce RBAC levels. Unknown routes must redirect to `/login` or `/access-control` based on authentication status.
3. **Component Types**:
   - **Pages/Views**: Coarse-grained, routing-driven views representing full screens (e.g., `AccessControlView.vue`, `DashboardView.vue`).
   - **Components**: Reusable, isolated UI components. They must communicate via props and events, remaining stateless whenever possible.

---

## 4. Offline-First Rules

1. **Local Integrity**: The database (PostgreSQL) is the source of truth. Under no circumstances should the system fail to boot or operate due to a lack of network connectivity.
2. **Local Assets**: All external assets, fonts, icons, and libraries must be packaged locally. CDN dependencies (like online Google Fonts or external JS script tags) are prohibited.
3. **Simulated State Machines**: The biometric engine must possess a self-sufficient state machine capable of operating continuously without internet-based biometric lookup engines.
