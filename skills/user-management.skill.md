# Skill: User and Role Management
This skill outlines how administrators manage staff accounts, roles, and system configuration rules.

---

## 1. Purpose
Control access to the admin dashboard, partition actions by staff role (Owner, Admin, Receptionist, Viewer), and manage security permissions.

## 2. Business Rules
1. **Roles Hierarchy**:
   - `owner`: Can manage all settings, database backups, and create/edit administrators.
   - `administrator`: Can manage members, memberships, and payments. Cannot delete owners.
   - `receptionist`: Can check members in, record payments, and view profiles. Cannot delete entries.
   - `viewer`: Read-only reporting dashboard access.
2. **Access Revocation**: Staff profiles can be deactivated, instantly invalidating any active JWTs.

## 3. Data Flow
1. Owner opens the "Staff Management" panel.
2. Clicks "Create User", defines names, emails, passwords, and assigns a role.
3. System saves the record to the `users` table, generating a hashed password.
4. When a user logs in, the backend loads permissions from `role_permissions` and attaches them to the JWT.

## 4. UI Expectations
- Grid of users showing active/inactive status badges.
- Edit form with role dropdown and visual description of permissions associated with the selected role.

## 5. Future Expansion
- Integration with Active Directory / LDAP for enterprise environments or SSO across multiple gym branches.
