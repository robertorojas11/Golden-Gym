# Security Rules - Gym Access Control System (v1)

This document establishes the security guidelines, JWT usage, and Role-Based Access Control (RBAC) requirements for the system.

---

## 1. Authentication

1. **Token-Based Auth**: Use JSON Web Tokens (JWT) for authentication. Tokens must contain the user's ID, role, permissions, and email.
2. **Token Expiration**: For on-premise deployments, the JWT expiration should be set to 12 hours to prevent receptionists from being logged out in the middle of a shift, but short enough to protect against overnight physical access.
3. **Password Hashing**: Passwords must be hashed using `bcrypt` (or Argon2) with a work factor of at least 10 before saving to the database.

---

## 2. Role-Based Access Control (RBAC)

1. **Roles Hierarchy**:
   - `owner`: Full system privileges, including creating administrators and backing up database files.
   - `administrator`: Can manage members, memberships, and payments, and view reports. Cannot modify system config or create `owner` users.
   - `receptionist`: Can view members, register payments, and manage access check-ins. Cannot delete transactions or modify membership plans.
   - `viewer`: Read-only access to member dashboards and basic metrics.

2. **Permissions Mapping**:
   - `create:users`: Allow creating users and staff. (Owner only)
   - `manage:memberships`: Create and update membership plans. (Owner, Admin)
   - `manage:payments`: Register and refund payments. (Owner, Admin, Receptionist)
   - `manage:access`: Manually grant access or scan biometrics. (Owner, Admin, Receptionist)
   - `view:reports`: Access charts, logs, and billing reports. (Owner, Admin, Viewer)
   - `system:config`: Modify gym logo, address, and hardware configurations. (Owner only)

3. **Backend Enforcement**:
   - Every API endpoint (except public authentication routes) must be protected by a `JwtAuthGuard` and a `RolesGuard`.
   - Access control must verify permissions, not just roles. Use the custom decorator `@RequirePermissions(Permission.MANAGE_PAYMENTS)`.

4. **Frontend Enforcement**:
   - UI elements (buttons, pages, sidebars) must adapt dynamically based on the current user's permissions loaded from Pinia.
   - Route guards must check permission credentials before loading views.
