# Golden Gym Access Control System

An offline-first, on-premise access control system designed for gym reception desks. It manages members, membership subscriptions, payments, and biometric check-ins locally without relying on external internet connectivity.

---

## 📂 Repository Structure

```text
├── .agents/               # AI Agent instructions and rules
│   └── rules/             # Quality gates (architecture, coding, database, etc.)
├── backend/               # NestJS Monolith API Server
├── database/              # PostgreSQL schema and seed queries
├── docker/                # Dockerfiles and Nginx reverse proxy configuration
├── docs/                  # System documentation and manuals
│   ├── README.md          # Documentation index and guide
│   ├── user_manual.md     # Operator instructions for staff
│   ├── system_architecture.md # Technical topology and modules
│   └── biometric_integration.md # Hardware bridge roadmap
├── frontend/              # Vue 3 Single Page Application
├── docker-compose.yml     # Docker Multi-container Orchestration
└── README.md              # This file
```

---

## ⚡ Quick Start

To boot the entire application stack in a local Docker environment:

1. Ensure the Docker daemon or Docker Desktop is running on your machine.
2. Open a terminal in this directory and execute:
   ```bash
   docker-compose up --build -d
   ```
3. Open your browser and navigate to:
   - **Client App**: [http://localhost](http://localhost)
   - **Backend API Docs**: [http://localhost/api](http://localhost/api) (or [http://localhost:3000](http://localhost:3000))

For default login credentials and operational workflows, refer to the [User Manual](file:///D:/Golden%20Gym/docs/user_manual.md).

---

## 📖 Comprehensive Documentation

For in-depth guides, manuals, and technical specifications, explore the [docs](file:///D:/Golden%20Gym/docs/README.md) directory:

- [Documentation Index](file:///D:/Golden%20Gym/docs/README.md)
- [User Manual & Operator Guide](file:///D:/Golden%20Gym/docs/user_manual.md)
- [System Architecture Document](file:///D:/Golden%20Gym/docs/system_architecture.md)
- [Biometric Hardware Integration Roadmap](file:///D:/Golden%20Gym/docs/biometric_integration.md)
