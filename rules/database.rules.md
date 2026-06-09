# Database Rules - Gym Access Control System (v1)

This document establishes constraints and guidelines for the PostgreSQL schema and queries used within the Gym Access Control System.

---

## 1. Schema Conventions

1. **Table Names**: All table names must be plural, lowercase, and use snake_case (e.g., `membership_plans`, `access_logs`).
2. **Column Names**: Column names must use lowercase snake_case (e.g., `member_id`, `first_name`).
3. **Primary Keys**: Every table must use a UUID (v4) primary key named `id`.
4. **Audit Columns**: Every table must include the following metadata columns for auditability and soft deletion:
   - `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL`
   - `updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL`
   - `deleted_at TIMESTAMP WITH TIME ZONE` (supports soft-delete)
5. **Foreign Keys**: Foreign keys must be explicitly named following the pattern `fk_{source_table}_{target_table}_{source_column}` and always index the referenced column.

---

## 2. Integrity and Constraints

1. **Soft Delete Handling**: All query builders and repositories must filter out rows where `deleted_at IS NOT NULL` unless explicitly requesting historical/restorable data.
2. **Cascading Behavior**:
   - Deleting a member must soft-delete their photo (`member_photos`) and notes (`member_notes`).
   - Deleting a membership plan must NOT cascade to memberships already purchased; memberships should reference the plan with a foreign key constraint that prevents deletion if in use, or set the plan reference to null while retaining plan snapshots.
3. **Immutability of Logs**: Records in `access_logs`, `audit_logs`, and `payments` are write-once. Updates are prohibited. Modifications must be handled via adjustments or refunds (with matching new entries).

---

## 3. Database Indexes

1. **Search Columns**: Index columns that are frequently used in `WHERE` clauses, such as `member_number`, `email`, and `last_name`.
2. **Access Control Indexes**: The `access_logs` table must have a composite index on `(member_id, created_at DESC)` to optimize lookup of recent entry history during fingerprint scanning.
3. **Foreign Keys**: Create indexes on all foreign key columns to avoid full table scans during joins.

---

## 4. Migration and Seed Control

1. **Migration Files**: Schema changes must be written in declarative SQL files inside the `database/` directory.
2. **Deterministic Seeds**: The system seed scripts must generate a default Owner user, baseline membership plans (Daily, Weekly, Monthly, Quarterly, Semiannual, Annual), and standard roles (`owner`, `administrator`, `receptionist`, `viewer`).
