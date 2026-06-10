import { Injectable } from '@nestjs/common';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  isActive: boolean;
}

export interface Member {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  email: string;
  phone: string;
  street: string;
  number: string;
  city: string;
  state: string;
  postalCode: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  registrationDate: string;
  isActive: boolean;
  photoUrl?: string;
  notes?: string[];
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  price: number; // in cents MXN
  durationDays: number;
  description: string;
  isActive: boolean;
}

export interface Membership {
  id: string;
  memberId: string;
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
}

export interface Payment {
  id: string;
  memberId: string;
  membershipId: string;
  paymentMethodId: string;
  paymentMethodName: string;
  amount: number; // in cents MXN
  referenceNumber: string;
  paymentDate: string;
  status: 'PAID' | 'REFUNDED' | 'FAILED';
  processedBy: string;
  processedByName?: string;
}

export interface AccessLog {
  id: string;
  memberId?: string;
  memberName?: string;
  memberNumber?: string;
  photoUrl?: string;
  membershipType?: string;
  membershipEndDate?: string;
  accessGranted: boolean;
  failureReason?: string;
  scannedAt: string;
}

@Injectable()
export class MockDatabase {
  public users: User[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'owner@goldengym.local',
      passwordHash: '$2b$10$wO8oK029e2yF.J4rN0Uaie31.h4x56PecH7P9C7j9eLgQhBfVj6xK', // Password123
      firstName: 'Marcus',
      lastName: 'Gold',
      roleId: '1a3b5c7d-9e11-4433-88bb-66cc77dd8801',
      roleName: 'owner',
      permissions: ['create:users', 'manage:memberships', 'manage:payments', 'manage:access', 'view:reports', 'system:config'],
      isActive: true,
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'admin@goldengym.local',
      passwordHash: '$2b$10$wO8oK029e2yF.J4rN0Uaie31.h4x56PecH7P9C7j9eLgQhBfVj6xK', // Password123
      firstName: 'Sarah',
      lastName: 'Connor',
      roleId: '2a4b6c8d-0e22-5544-99cc-77dd88ee9902',
      roleName: 'administrator',
      permissions: ['manage:memberships', 'manage:payments', 'manage:access', 'view:reports'],
      isActive: true,
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      email: 'reception@goldengym.local',
      passwordHash: '$2b$10$wO8oK029e2yF.J4rN0Uaie31.h4x56PecH7P9C7j9eLgQhBfVj6xK', // Password123
      firstName: 'Lucas',
      lastName: 'Vance',
      roleId: '3a5b7c9d-1e33-6655-aacc-88ee99ff0003',
      roleName: 'receptionist',
      permissions: ['manage:payments', 'manage:access'],
      isActive: true,
    },
  ];

  public members: Member[] = [
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001',
      memberNumber: 'MEM-1001',
      firstName: 'Roberto',
      lastName: 'Mendes',
      gender: 'Masculino',
      birthDate: '1988-04-12',
      email: 'roberto.m@gmail.local',
      phone: '555-0199',
      street: 'Av. Insurgentes',
      number: '120',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '06700',
      emergencyContactName: 'Maria Mendes',
      emergencyContactPhone: '555-0188',
      emergencyContactRelationship: 'Esposa',
      registrationDate: '2026-01-05',
      isActive: true,
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80',
      notes: ['Prefiere entrenar por la mañana. Sensibilidad leve en la rodilla.'],
      createdBy: '33333333-3333-3333-3333-333333333333',
      createdByName: 'Lucas Vance',
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002',
      memberNumber: 'MEM-1002',
      firstName: 'Carla',
      lastName: 'Sánchez',
      gender: 'Femenino',
      birthDate: '1995-10-23',
      email: 'carla.s@yahoo.local',
      phone: '555-0144',
      street: 'Paseo de la Reforma',
      number: '45B',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '06500',
      emergencyContactName: 'Juan Sánchez',
      emergencyContactPhone: '555-0145',
      emergencyContactRelationship: 'Padre',
      registrationDate: '2026-02-12',
      isActive: true,
      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80',
      notes: ['Inscrita en clases de spinning desde esta semana.'],
      createdBy: '22222222-2222-2222-2222-222222222222',
      createdByName: 'Sarah Connor',
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003',
      memberNumber: 'MEM-1003',
      firstName: 'Juan',
      lastName: 'Pérez',
      gender: 'Masculino',
      birthDate: '1990-01-01',
      email: 'juan.perez@email.local',
      phone: '555-0100',
      street: 'Av. Juárez',
      number: '789',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '06000',
      emergencyContactName: 'Juana Pérez',
      emergencyContactPhone: '555-0101',
      emergencyContactRelationship: 'Hermana',
      registrationDate: '2026-05-15',
      isActive: true,
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80',
      notes: [],
      createdBy: '33333333-3333-3333-3333-333333333333',
      createdByName: 'Lucas Vance',
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0004',
      memberNumber: 'MEM-1004',
      firstName: 'David',
      lastName: 'Alaba',
      gender: 'Masculino',
      birthDate: '1992-06-24',
      email: 'david.a@gmail.local',
      phone: '555-0155',
      street: 'Av. Patriotismo',
      number: '450',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '03700',
      emergencyContactName: 'Sandra Alaba',
      emergencyContactPhone: '555-0156',
      emergencyContactRelationship: 'Hermana',
      registrationDate: '2026-06-09',
      isActive: true,
      photoUrl: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&w=256&h=256&q=80',
      notes: [],
      createdBy: '33333333-3333-3333-3333-333333333333',
      createdByName: 'Lucas Vance',
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0005',
      memberNumber: 'MEM-1005',
      firstName: 'Sofía',
      lastName: 'Vergara',
      gender: 'Femenino',
      birthDate: '1972-07-10',
      email: 'sofia.v@gmail.local',
      phone: '555-0166',
      street: 'Campos Elíseos',
      number: '23',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '11560',
      emergencyContactName: 'Manolo Vergara',
      emergencyContactPhone: '555-0167',
      emergencyContactRelationship: 'Hijo',
      registrationDate: '2026-06-08',
      isActive: true,
      photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80',
      notes: ['Entrenamiento de alta intensidad solicitado.'],
      createdBy: '33333333-3333-3333-3333-333333333333',
      createdByName: 'Lucas Vance',
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0006',
      memberNumber: 'MEM-1006',
      firstName: 'Carlos',
      lastName: 'Slim',
      gender: 'Masculino',
      birthDate: '1940-01-28',
      email: 'carlos.slim@telmex.local',
      phone: '555-0177',
      street: 'Paseo de las Palmas',
      number: '800',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '11000',
      emergencyContactName: 'Carlos Slim Domit',
      emergencyContactPhone: '555-0178',
      emergencyContactRelationship: 'Hijo',
      registrationDate: '2026-05-20',
      isActive: true,
      photoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&h=256&q=80',
      notes: ['Clases de natación o ejercicios cardiovasculares de bajo impacto.'],
      createdBy: '22222222-2222-2222-2222-222222222222',
      createdByName: 'Sarah Connor',
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0007',
      memberNumber: 'MEM-1007',
      firstName: 'Diana',
      lastName: 'Prince',
      gender: 'Femenino',
      birthDate: '1984-05-18',
      email: 'diana.prince@museum.local',
      phone: '555-0188',
      street: 'Av. Horacio',
      number: '1420',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '11510',
      emergencyContactName: 'Steve Trevor',
      emergencyContactPhone: '555-0189',
      emergencyContactRelationship: 'Amigo',
      registrationDate: '2026-04-10',
      isActive: true,
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
      notes: ['Fuerza y acondicionamiento avanzado.'],
      createdBy: '11111111-1111-1111-1111-111111111111',
      createdByName: 'Marcus Gold',
    },
  ];

  public plans: MembershipPlan[] = [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Pase Diario',
      price: 4000,
      durationDays: 1,
      description: 'Acceso completo por 24 horas a áreas de pesas y cardio',
      isActive: true,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      name: 'Pase Semanal',
      price: 10000,
      durationDays: 7,
      description: 'Acceso completo por 7 días hábiles consecutivos',
      isActive: true,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000003',
      name: 'Mensual Estándar',
      price: 35000,
      durationDays: 30,
      description: 'Acceso completo, lockers y clases incluidas',
      isActive: true,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000004',
      name: 'Trimestral Estándar',
      price: 95000,
      durationDays: 90,
      description: '3 meses de acceso completo, incluye acceso a clases y uso de lockers',
      isActive: true,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000005',
      name: 'Semestral Estandar',
      price: 200000,
      durationDays: 180,
      description: '6 meses de acceso completo, incluye acceso a clases y uso de lockers',
      isActive: true,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000006',
      name: 'Anual Estandar',
      price: 400000,
      durationDays: 365,
      description: '12 meses de acceso completo, incluye acceso a clases y uso de lockers',
      isActive: true,
    },
  ];

  public memberships: Membership[] = [
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccc0001',
      memberId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001',
      planId: 'a0000000-0000-0000-0000-000000000003',
      planName: 'Mensual Estándar',
      startDate: '2026-06-01',
      endDate: '2026-07-01',
      status: 'ACTIVE',
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccc0002',
      memberId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002',
      planId: 'a0000000-0000-0000-0000-000000000006',
      planName: 'Anual Estandar',
      startDate: '2026-02-12',
      endDate: '2027-02-12',
      status: 'ACTIVE',
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccc0003',
      memberId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003',
      planId: 'a0000000-0000-0000-0000-000000000001',
      planName: 'Pase Diario',
      startDate: '2026-05-15',
      endDate: '2026-05-16',
      status: 'EXPIRED',
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccc0004',
      memberId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0004',
      planId: 'a0000000-0000-0000-0000-000000000001',
      planName: 'Pase Diario',
      startDate: '2026-06-10',
      endDate: '2026-06-11',
      status: 'ACTIVE',
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccc0005',
      memberId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0005',
      planId: 'a0000000-0000-0000-0000-000000000002',
      planName: 'Pase Semanal',
      startDate: '2026-06-08',
      endDate: '2026-06-15',
      status: 'ACTIVE',
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccc0006',
      memberId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0006',
      planId: 'a0000000-0000-0000-0000-000000000004',
      planName: 'Trimestral Estándar',
      startDate: '2026-05-20',
      endDate: '2026-08-20',
      status: 'ACTIVE',
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccc0007',
      memberId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0007',
      planId: 'a0000000-0000-0000-0000-000000000005',
      planName: 'Semestral Estandar',
      startDate: '2026-04-10',
      endDate: '2026-10-10',
      status: 'ACTIVE',
    },
  ];

  public payments: Payment[] = [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      memberId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001',
      membershipId: 'cccccccc-cccc-cccc-cccc-cccccccc0001',
      paymentMethodId: '90000000-0000-0000-0000-000000000003',
      paymentMethodName: 'Tarjeta de Crédito',
      amount: 35000,
      referenceNumber: 'REF-8827419',
      paymentDate: '2026-06-01T09:15:00Z',
      status: 'PAID',
      processedBy: '33333333-3333-3333-3333-333333333333',
      processedByName: 'Lucas Vance',
    },
    {
      id: 'd0000000-0000-0000-0000-000000000002',
      memberId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002',
      membershipId: 'cccccccc-cccc-cccc-cccc-cccccccc0002',
      paymentMethodId: '90000000-0000-0000-0000-000000000004',
      paymentMethodName: 'Transferencia',
      amount: 400000,
      referenceNumber: 'REF-9912837',
      paymentDate: '2026-02-12T14:30:00Z',
      status: 'PAID',
      processedBy: '22222222-2222-2222-2222-222222222222',
      processedByName: 'Sarah Connor',
    },
    {
      id: 'd0000000-0000-0000-0000-000000000003',
      memberId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003',
      membershipId: 'cccccccc-cccc-cccc-cccc-cccccccc0003',
      paymentMethodId: '90000000-0000-0000-0000-000000000001',
      paymentMethodName: 'Efectivo',
      amount: 4000,
      referenceNumber: 'REF-1234567',
      paymentDate: '2026-05-15T08:00:00Z',
      status: 'PAID',
      processedBy: '33333333-3333-3333-3333-333333333333',
      processedByName: 'Lucas Vance',
    },
    {
      id: 'd0000000-0000-0000-0000-000000000004',
      memberId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0004',
      membershipId: 'cccccccc-cccc-cccc-cccc-cccccccc0004',
      paymentMethodId: '90000000-0000-0000-0000-000000000001',
      paymentMethodName: 'Efectivo',
      amount: 4000,
      referenceNumber: 'REF-0000104',
      paymentDate: '2026-06-10T08:00:00Z',
      status: 'PAID',
      processedBy: '33333333-3333-3333-3333-333333333333',
      processedByName: 'Lucas Vance',
    },
    {
      id: 'd0000000-0000-0000-0000-000000000005',
      memberId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0005',
      membershipId: 'cccccccc-cccc-cccc-cccc-cccccccc0005',
      paymentMethodId: '90000000-0000-0000-0000-000000000002',
      paymentMethodName: 'Tarjeta de Débito',
      amount: 10000,
      referenceNumber: 'REF-0000105',
      paymentDate: '2026-06-08T10:15:00Z',
      status: 'PAID',
      processedBy: '33333333-3333-3333-3333-333333333333',
      processedByName: 'Lucas Vance',
    },
    {
      id: 'd0000000-0000-0000-0000-000000000006',
      memberId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0006',
      membershipId: 'cccccccc-cccc-cccc-cccc-cccccccc0006',
      paymentMethodId: '90000000-0000-0000-0000-000000000004',
      paymentMethodName: 'Transferencia',
      amount: 95000,
      referenceNumber: 'REF-0000106',
      paymentDate: '2026-05-20T11:00:00Z',
      status: 'PAID',
      processedBy: '22222222-2222-2222-2222-222222222222',
      processedByName: 'Sarah Connor',
    },
    {
      id: 'd0000000-0000-0000-0000-000000000007',
      memberId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0007',
      membershipId: 'cccccccc-cccc-cccc-cccc-cccccccc0007',
      paymentMethodId: '90000000-0000-0000-0000-000000000003',
      paymentMethodName: 'Tarjeta de Crédito',
      amount: 200000,
      referenceNumber: 'REF-0000107',
      paymentDate: '2026-04-10T09:00:00Z',
      status: 'PAID',
      processedBy: '11111111-1111-1111-1111-111111111111',
      processedByName: 'Marcus Gold',
    },
  ];

  public accessLogs: AccessLog[] = [
    {
      id: 'e0000000-0000-0000-0000-000000000001',
      memberId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001',
      memberName: 'Roberto Mendes',
      memberNumber: 'MEM-1001',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80',
      membershipType: 'Mensual Estándar',
      membershipEndDate: '2026-07-01',
      accessGranted: true,
      scannedAt: '2026-06-08T08:30:00Z',
    },
    {
      id: 'e0000000-0000-0000-0000-000000000002',
      memberId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002',
      memberName: 'Carla Sánchez',
      memberNumber: 'MEM-1002',
      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80',
      membershipType: 'Anual Oro VIP',
      membershipEndDate: '2027-02-12',
      accessGranted: true,
      scannedAt: '2026-06-08T17:45:00Z',
    },
    {
      id: 'e0000000-0000-0000-0000-000000000003',
      memberId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003',
      memberName: 'Juan Pérez',
      memberNumber: 'MEM-1003',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80',
      membershipType: 'Pase Diario',
      membershipEndDate: '2026-05-16',
      accessGranted: false,
      failureReason: 'EXPIRED_MEMBERSHIP',
      scannedAt: '2026-06-08T18:00:00Z',
    },
  ];
}
