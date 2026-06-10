-- Datos semilla (Seeds) para el Sistema de Control de Acceso - Golden Gym (v1)

-- 1. Insertar Permisos
INSERT INTO permissions (id, name, description) VALUES
('b3058866-9a25-4c07-96a2-6f176b6b7720', 'create:users', 'Permite crear cuentas de administradores y personal'),
('c5e317e3-0d3c-41c3-bf2e-dce23078cdbe', 'manage:memberships', 'Permite crear, editar y desactivar planes de membresía'),
('e6a4b184-b040-410c-be4e-4b2a6ad9a813', 'manage:payments', 'Permite registrar y reembolsar pagos'),
('f99066d4-d3a9-4674-9f20-fa7d1be275de', 'manage:access', 'Permite control de acceso manual y administración de biometría'),
('d5d9c228-2d88-469b-98f9-4b476e336b9e', 'view:reports', 'Permite ver métricas, estadísticas financieras e historiales'),
('a5c4e12e-1e66-4cf3-bf43-4cc170e7e1ee', 'system:config', 'Permite modificar detalles del gimnasio y configuraciones del hardware');

-- 2. Insertar Roles
INSERT INTO roles (id, name, description) VALUES
('1a3b5c7d-9e11-4433-88bb-66cc77dd8801', 'owner', 'Propietario - Privilegios totales en el sistema'),
('2a4b6c8d-0e22-5544-99cc-77dd88ee9902', 'administrator', 'Administrador/Gerente - Tareas de gestión general excepto configuración de hardware'),
('3a5b7c9d-1e33-6655-aacc-88ee99ff0003', 'receptionist', 'Recepcionista - Registro de accesos, inscripción de miembros y cobros'),
('4a6b8c0d-2e44-7766-bbdd-99ff00aa1104', 'viewer', 'Visor - Acceso de sólo lectura para reportes y estadísticas');

-- 3. Vincular Permisos a Roles
-- Propietario (Owner) tiene todos los permisos
INSERT INTO role_permissions (role_id, permission_id) VALUES
('1a3b5c7d-9e11-4433-88bb-66cc77dd8801', 'b3058866-9a25-4c07-96a2-6f176b6b7720'),
('1a3b5c7d-9e11-4433-88bb-66cc77dd8801', 'c5e317e3-0d3c-41c3-bf2e-dce23078cdbe'),
('1a3b5c7d-9e11-4433-88bb-66cc77dd8801', 'e6a4b184-b040-410c-be4e-4b2a6ad9a813'),
('1a3b5c7d-9e11-4433-88bb-66cc77dd8801', 'f99066d4-d3a9-4674-9f20-fa7d1be275de'),
('1a3b5c7d-9e11-4433-88bb-66cc77dd8801', 'd5d9c228-2d88-469b-98f9-4b476e336b9e'),
('1a3b5c7d-9e11-4433-88bb-66cc77dd8801', 'a5c4e12e-1e66-4cf3-bf43-4cc170e7e1ee');

-- Administrador (Administrator) tiene manage:memberships, manage:payments, manage:access, view:reports
INSERT INTO role_permissions (role_id, permission_id) VALUES
('2a4b6c8d-0e22-5544-99cc-77dd88ee9902', 'c5e317e3-0d3c-41c3-bf2e-dce23078cdbe'),
('2a4b6c8d-0e22-5544-99cc-77dd88ee9902', 'e6a4b184-b040-410c-be4e-4b2a6ad9a813'),
('2a4b6c8d-0e22-5544-99cc-77dd88ee9902', 'f99066d4-d3a9-4674-9f20-fa7d1be275de'),
('2a4b6c8d-0e22-5544-99cc-77dd88ee9902', 'd5d9c228-2d88-469b-98f9-4b476e336b9e');

-- Recepcionista (Receptionist) tiene manage:payments, manage:access
INSERT INTO role_permissions (role_id, permission_id) VALUES
('3a5b7c9d-1e33-6655-aacc-88ee99ff0003', 'e6a4b184-b040-410c-be4e-4b2a6ad9a813'),
('3a5b7c9d-1e33-6655-aacc-88ee99ff0003', 'f99066d4-d3a9-4674-9f20-fa7d1be275de');

-- Visor (Viewer) tiene view:reports
INSERT INTO role_permissions (role_id, permission_id) VALUES
('4a6b8c0d-2e44-7766-bbdd-99ff00aa1104', 'd5d9c228-2d88-469b-98f9-4b476e336b9e');

-- 4. Crear Cuentas de Personal
-- Contraseñas por defecto: 'Password123'
INSERT INTO users (id, email, password_hash, first_name, last_name, role_id, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'owner@goldengym.local', '$2b$10$wO8oK029e2yF.J4rN0Uaie31.h4x56PecH7P9C7j9eLgQhBfVj6xK', 'Marcus', 'Gold', '1a3b5c7d-9e11-4433-88bb-66cc77dd8801', TRUE),
('22222222-2222-2222-2222-222222222222', 'admin@goldengym.local', '$2b$10$wO8oK029e2yF.J4rN0Uaie31.h4x56PecH7P9C7j9eLgQhBfVj6xK', 'Sarah', 'Connor', '2a4b6c8d-0e22-5544-99cc-77dd88ee9902', TRUE),
('33333333-3333-3333-3333-333333333333', 'reception@goldengym.local', '$2b$10$wO8oK029e2yF.J4rN0Uaie31.h4x56PecH7P9C7j9eLgQhBfVj6xK', 'Lucas', 'Vance', '3a5b7c9d-1e33-6655-aacc-88ee99ff0003', TRUE);

-- 5. Crear Métodos de Pago
INSERT INTO payment_methods (id, name, is_active) VALUES
('90000000-0000-0000-0000-000000000001', 'Efectivo', TRUE),
('90000000-0000-0000-0000-000000000002', 'Tarjeta de Débito', TRUE),
('90000000-0000-0000-0000-000000000003', 'Tarjeta de Crédito', TRUE),
('90000000-0000-0000-0000-000000000004', 'Transferencia', TRUE);

-- 6. Insertar Planes de Membresía (Precios en centavos de Peso Mexicano MXN)
-- Pase Diario: $200 MXN -> 20000 centavos
-- Pase Semanal: $600 MXN -> 60000 centavos
-- Mensual Estándar: $1,100 MXN -> 110000 centavos
-- Trimestral Estándar: $3,000 MXN -> 300000 centavos
-- Semestral Plata: $5,500 MXN -> 550000 centavos
-- Anual Oro VIP: $9,900 MXN -> 990000 centavos
INSERT INTO membership_plans (id, name, price, duration_days, description) VALUES
('a0000000-0000-0000-0000-000000000001', 'Pase Diario', 20000, 1, 'Acceso completo por 24 horas a áreas de pesas y cardio'),
('a0000000-0000-0000-0000-000000000002', 'Pase Semanal', 60000, 7, 'Acceso ilimitado por 7 días naturales consecutivos'),
('a0000000-0000-0000-0000-000000000003', 'Mensual Estándar', 110000, 30, 'Acceso completo, lockers y clases grupales incluidas'),
('a0000000-0000-0000-0000-000000000004', 'Trimestral Estándar', 300000, 90, '3 meses de acceso completo con evaluación física de regalo'),
('a0000000-0000-0000-0000-000000000005', 'Semestral Plata', 550000, 180, '6 meses de acceso completo, clases especiales y lockers VIP'),
('a0000000-0000-0000-0000-000000000006', 'Anual Oro VIP', 990000, 365, '12 meses con privilegios VIP, entrenador personal y kit de toallas');

-- 7. Insertar Miembros
INSERT INTO members (id, member_number, first_name, last_name, gender, birth_date, email, phone, street, number, city, state, postal_code, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, registration_date, is_active, created_by) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', 'MEM-1001', 'Roberto', 'Mendes', 'Masculino', '1988-04-12', 'roberto.m@gmail.local', '555-0199', 'Av. Insurgentes', '120', 'Ciudad de México', 'CDMX', '06700', 'Maria Mendes', '555-0188', 'Esposa', '2026-01-05', TRUE, '33333333-3333-3333-3333-333333333333'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002', 'MEM-1002', 'Carla', 'Sánchez', 'Femenino', '1995-10-23', 'carla.s@yahoo.local', '555-0144', 'Paseo de la Reforma', '45B', 'Ciudad de México', 'CDMX', '06500', 'Juan Sánchez', '555-0145', 'Padre', '2026-02-12', TRUE, '22222222-2222-2222-2222-222222222222'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003', 'MEM-1003', 'Juan', 'Pérez', 'Masculino', '1990-01-01', 'juan.perez@email.local', '555-0100', 'Av. Juárez', '789', 'Ciudad de México', 'CDMX', '06000', 'Juana Pérez', '555-0101', 'Hermana', '2026-05-15', TRUE, '33333333-3333-3333-3333-333333333333');

-- 8. Agregar Fotos de Miembros
INSERT INTO member_photos (id, member_id, photo_url, is_primary) VALUES
(uuid_generate_v4(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80', TRUE),
(uuid_generate_v4(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80', TRUE),
(uuid_generate_v4(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80', TRUE);

-- 9. Agregar Notas de Miembros
INSERT INTO member_notes (id, member_id, author_id, note) VALUES
(uuid_generate_v4(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', '11111111-1111-1111-1111-111111111111', 'Prefiere entrenar por la mañana. Sensibilidad leve en la rodilla.'),
(uuid_generate_v4(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002', '22222222-2222-2222-2222-222222222222', 'Inscrita en clases de spinning desde esta semana.');

-- 10. Agregar Membresías
-- Roberto: Mensual Estándar Activa
INSERT INTO memberships (id, member_id, plan_id, start_date, end_date, status) VALUES
('cccccccc-cccc-cccc-cccc-cccccccc0001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', 'a0000000-0000-0000-0000-000000000003', '2026-06-01', '2026-07-01', 'ACTIVE');

-- Carla: Anual Oro VIP Activa
INSERT INTO memberships (id, member_id, plan_id, start_date, end_date, status) VALUES
('cccccccc-cccc-cccc-cccc-cccccccc0002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002', 'a0000000-0000-0000-0000-000000000006', '2026-02-12', '2027-02-12', 'ACTIVE');

-- Juan: Pase Diario Vencido (de Mayo 15)
INSERT INTO memberships (id, member_id, plan_id, start_date, end_date, status) VALUES
('cccccccc-cccc-cccc-cccc-cccccccc0003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003', 'a0000000-0000-0000-0000-000000000001', '2026-05-15', '2026-05-16', 'EXPIRED');

-- 11. Agregar Registro de Pagos
-- Roberto pagó $1,100 MXN en tarjeta de crédito
INSERT INTO payments (id, member_id, membership_id, payment_method_id, amount, reference_number, payment_date, status, processed_by) VALUES
(uuid_generate_v4(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', 'cccccccc-cccc-cccc-cccc-cccccccc0001', '90000000-0000-0000-0000-000000000003', 110000, 'REF-8827419', '2026-06-01 09:15:00+00', 'PAID', '33333333-3333-3333-3333-333333333333');

-- Carla pagó $9,900 MXN en transferencia
INSERT INTO payments (id, member_id, membership_id, payment_method_id, amount, reference_number, payment_date, status, processed_by) VALUES
(uuid_generate_v4(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002', 'cccccccc-cccc-cccc-cccc-cccccccc0002', '90000000-0000-0000-0000-000000000004', 990000, 'REF-9912837', '2026-02-12 14:30:00+00', 'PAID', '22222222-2222-2222-2222-222222222222');

-- Juan pagó $200 MXN en efectivo
INSERT INTO payments (id, member_id, membership_id, payment_method_id, amount, reference_number, payment_date, status, processed_by) VALUES
(uuid_generate_v4(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003', 'cccccccc-cccc-cccc-cccc-cccccccc0003', '90000000-0000-0000-0000-000000000001', 20000, 'REF-1234567', '2026-05-15 08:00:00+00', 'PAID', '33333333-3333-3333-3333-333333333333');

-- 12. Agregar Bitácora de Accesos
INSERT INTO access_logs (id, member_id, access_granted, failure_reason, scanned_at) VALUES
(uuid_generate_v4(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', TRUE, NULL, '2026-06-08 08:30:00+00'),
(uuid_generate_v4(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002', TRUE, NULL, '2026-06-08 17:45:00+00'),
(uuid_generate_v4(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003', FALSE, 'EXPIRED_MEMBERSHIP', '2026-06-08 18:00:00+00');

-- 13. Configuraciones del Sistema
INSERT INTO system_settings (key, value, description) VALUES
('gym_name', 'Centro de Recepción Golden Gym', 'Nombre comercial oficial de la sede del gimnasio'),
('biometric_confidence_threshold', '85.0', 'Porcentaje de confianza patrón necesario para validar una huella digital'),
('auto_backup_enabled', 'true', 'Habilita respaldos de base de datos automáticos locales cada hora');
