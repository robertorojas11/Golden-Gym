-- Clean seeds for Golden Gym Access Control System
-- Only contains roles, permissions, default accounts, payment methods, system settings, and basic membership plans.

-- 1. Insert Permissions
INSERT INTO permissions (id, name, description) VALUES
('b3058866-9a25-4c07-96a2-6f176b6b7720', 'create:users', 'Permite crear cuentas de administradores y personal'),
('c5e317e3-0d3c-41c3-bf2e-dce23078cdbe', 'manage:memberships', 'Permite crear, editar y desactivar planes de membresía'),
('e6a4b184-b040-410c-be4e-4b2a6ad9a813', 'manage:payments', 'Permite registrar y reembolsar pagos'),
('f99066d4-d3a9-4674-9f20-fa7d1be275de', 'manage:access', 'Permite control de acceso manual y administración de biometría'),
('d5d9c228-2d88-469b-98f9-4b476e336b9e', 'view:reports', 'Permite ver métricas, estadísticas financieras e historiales'),
('a5c4e12e-1e66-4cf3-bf43-4cc170e7e1ee', 'system:config', 'Permite modificar detalles del gimnasio y configuraciones del hardware');

-- 2. Insert Roles
INSERT INTO roles (id, name, description) VALUES
('1a3b5c7d-9e11-4433-88bb-66cc77dd8801', 'owner', 'Propietario - Privilegios totales en el sistema'),
('2a4b6c8d-0e22-5544-99cc-77dd88ee9902', 'administrator', 'Administrador/Gerente - Tareas de gestión general excepto configuración de hardware'),
('3a5b7c9d-1e33-6655-aacc-88ee99ff0003', 'receptionist', 'Recepcionista - Registro de accesos, inscripción de miembros y cobros'),
('4a6b8c0d-2e44-7766-bbdd-99ff00aa1104', 'viewer', 'Visor - Acceso de sólo lectura para reportes y estadísticas');

-- 3. Link Permissions to Roles
-- Owner has all permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
('1a3b5c7d-9e11-4433-88bb-66cc77dd8801', 'b3058866-9a25-4c07-96a2-6f176b6b7720'),
('1a3b5c7d-9e11-4433-88bb-66cc77dd8801', 'c5e317e3-0d3c-41c3-bf2e-dce23078cdbe'),
('1a3b5c7d-9e11-4433-88bb-66cc77dd8801', 'e6a4b184-b040-410c-be4e-4b2a6ad9a813'),
('1a3b5c7d-9e11-4433-88bb-66cc77dd8801', 'f99066d4-d3a9-4674-9f20-fa7d1be275de'),
('1a3b5c7d-9e11-4433-88bb-66cc77dd8801', 'd5d9c228-2d88-469b-98f9-4b476e336b9e'),
('1a3b5c7d-9e11-4433-88bb-66cc77dd8801', 'a5c4e12e-1e66-4cf3-bf43-4cc170e7e1ee');

-- Administrator has manage:memberships, manage:payments, manage:access, view:reports
INSERT INTO role_permissions (role_id, permission_id) VALUES
('2a4b6c8d-0e22-5544-99cc-77dd88ee9902', 'c5e317e3-0d3c-41c3-bf2e-dce23078cdbe'),
('2a4b6c8d-0e22-5544-99cc-77dd88ee9902', 'e6a4b184-b040-410c-be4e-4b2a6ad9a813'),
('2a4b6c8d-0e22-5544-99cc-77dd88ee9902', 'f99066d4-d3a9-4674-9f20-fa7d1be275de'),
('2a4b6c8d-0e22-5544-99cc-77dd88ee9902', 'd5d9c228-2d88-469b-98f9-4b476e336b9e');

-- Receptionist has manage:memberships, manage:payments, manage:access
INSERT INTO role_permissions (role_id, permission_id) VALUES
('3a5b7c9d-1e33-6655-aacc-88ee99ff0003', 'c5e317e3-0d3c-41c3-bf2e-dce23078cdbe'),
('3a5b7c9d-1e33-6655-aacc-88ee99ff0003', 'e6a4b184-b040-410c-be4e-4b2a6ad9a813'),
('3a5b7c9d-1e33-6655-aacc-88ee99ff0003', 'f99066d4-d3a9-4674-9f20-fa7d1be275de');

-- Viewer has view:reports
INSERT INTO role_permissions (role_id, permission_id) VALUES
('4a6b8c0d-2e44-7766-bbdd-99ff00aa1104', 'd5d9c228-2d88-469b-98f9-4b476e336b9e');

-- 4. Create Initial Staff Accounts
-- Default password is encrypted using SHA-256 for: 'Golden#2026'
-- SHA-256: f6467178e06362ac0b6afedea6c7a008ae29d7437435291bb9a7a8e2fe3d4975
INSERT INTO users (id, email, password_hash, first_name, last_name, role_id, is_active, must_change_password) VALUES
('11111111-1111-1111-1111-111111111111', 'goldencorpsgym@gmail.com', 'f6467178e06362ac0b6afedea6c7a008ae29d7437435291bb9a7a8e2fe3d4975', 'Angie', 'Garfias', '1a3b5c7d-9e11-4433-88bb-66cc77dd8801', TRUE, TRUE);

-- 5. Create Payment Methods
INSERT INTO payment_methods (id, name, is_active) VALUES
('90000000-0000-0000-0000-000000000001', 'Efectivo', TRUE),
('90000000-0000-0000-0000-000000000002', 'Tarjeta de Débito', TRUE),
('90000000-0000-0000-0000-000000000003', 'Tarjeta de Crédito', TRUE),
('90000000-0000-0000-0000-000000000004', 'Transferencia', TRUE);

-- 7. System Settings
INSERT INTO system_settings (key, value, description) VALUES
('gym_name', 'Centro de Recepción Golden Gym', 'Nombre comercial oficial de la sede del gimnasio'),
('biometric_confidence_threshold', '85.0', 'Porcentaje de confianza patrón necesario para validar una huella digital'),
('auto_backup_enabled', 'true', 'Habilita respaldos de base de datos automáticos locales cada hora');
