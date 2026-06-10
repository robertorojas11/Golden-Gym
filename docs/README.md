# Golden Gym - Documentation Index

Welcome to the documentation suite for the Gym Access Control System. Below is a map of all available user manuals, technical designs, roadmaps, and architectural rules.

---

## 📖 Operational Guides & Manuals

* **[User Manual & Operator Guide](file:///D:/Golden%20Gym/docs/user_manual.md)**
  * *Target Audience*: Gym Receptionists, Owners, and Administrators.
  * *Contents*: Quick start with Docker, default role credentials (Owner, Admin, Receptionist), registration workflows, payment logging, and biometric check-in simulation commands.

---

## 🛠 Technical Specifications & Roadmap

* **[System Architecture Document](file:///D:/Golden%20Gym/docs/system_architecture.md)**
  * *Target Audience*: Developers, DevOps Engineers, and Architects.
  * *Contents*: Monolithic topology diagram, detailed NestJS module list, Vue 3 Pinia state stores description, and database schema constraints.
* **[Biometric Hardware Integration Plan](file:///D:/Golden%20Gym/docs/biometric_integration.md)**
  * *Target Audience*: Hardware Integration and Backend Engineers.
  * *Contents*: Architecture options for bridging real USB fingerprint scanners via WebSocket Daemons or native NodeJS bindings, and API schemas.

---

## 🛡 Quality Gates & Rules

For development standards, refer to the active rule files:

* **[Architecture Rules](file:///D:/Golden%20Gym/.agents/rules/architecture.rules.md)**: Standards for NestJS dependency injection, controllers, services, repositories, DTO validations, and Vue 3 stores.
* **[Database Rules](file:///D:/Golden%20Gym/.agents/rules/database.rules.md)**: Conventions for table/column naming, primary keys (UUID v4), audit fields, cascading behavior, soft delete logic, and indexes.
* **[Security Rules (RBAC)](file:///D:/Golden%20Gym/.agents/rules/security.rules.md)**: Guidelines on password hashing (bcrypt), JWT tokens, and detailed Permission mappings for each role (`owner`, `administrator`, `receptionist`, `viewer`).
* **[Coding Rules](file:///D:/Golden%20Gym/.agents/rules/coding.rules.md)**: Code formatting standards, linting policies, error handling practices, and API response guidelines.
* **[UI Rules](file:///D:/Golden%20Gym/.agents/rules/ui.rules.md)**: Aesthetics, responsive design guidelines, micro-interactions, components standards, and CSS conventions.
* **[Business Rules](file:///D:/Golden%20Gym/.agents/rules/business.rules.md)**: Rules on grace periods, checkout limits, scan frequency block periods, overlapping memberships, and payment life-cycle requirements.
* **[Deployment Rules](file:///D:/Golden%20Gym/.agents/rules/deployment.rules.md)**: Docker container building instructions, volume persistency configurations, and host system requirements.
