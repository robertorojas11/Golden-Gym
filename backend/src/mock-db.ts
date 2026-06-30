import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { createHash } from 'crypto';

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
  mustChangePassword?: boolean;
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
  isGroup?: boolean;
  maxMembers?: number;
}

export interface Membership {
  id: string;
  memberId: string;
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  parentMembershipId?: string;
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

export interface MemberDocument {
  id: string;
  memberId: string;
  summary: string;
  fileData: string; // Base64 encoded PDF
  mimeType: string;
  uploadedAt: string;
}

@Injectable()
export class MockDatabase implements OnModuleInit {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'gym_admin',
      password: process.env.DB_PASSWORD || 'gym_password_secure_local_188',
      database: process.env.DB_NAME || 'goldengym_access',
    });
  }

  public users: User[] = [];
  public members: Member[] = [];
  public plans: MembershipPlan[] = [];
  public memberships: Membership[] = [];
  public payments: Payment[] = [];
  public accessLogs: AccessLog[] = [];
  public documents: MemberDocument[] = [];

  async onModuleInit() {
    console.log('Initializing connection to PostgreSQL...');
    const maxRetries = 10;
    const delayMs = 3000;
    let connected = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.pool.query('SELECT 1');
        console.log('PostgreSQL connection established successfully. Running schema upgrades...');
        
        // Ensure new group plans columns exist in schema
        await this.pool.query('ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT FALSE NOT NULL');
        await this.pool.query('ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS max_members INT DEFAULT 1');
        await this.pool.query('ALTER TABLE memberships ADD COLUMN IF NOT EXISTS parent_membership_id UUID REFERENCES memberships(id) ON DELETE CASCADE');

        connected = true;
        break;
      } catch (err) {
        console.warn(`PostgreSQL connection attempt ${attempt}/${maxRetries} failed. Retrying in ${delayMs / 1000}s...`);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          console.error('Failed to initialize PostgreSQL database connection after maximum attempts. Loading hardcoded mock values.', err);
        }
      }
    }

    if (connected) {
      try {
        await this.loadAllFromDatabase();
      } catch (err) {
        console.error('Failed to load data from PostgreSQL database. Falling back to mock values.', err);
        this.loadMockBackup();
      }
    } else {
      this.loadMockBackup();
    }
  }

  async loadAllFromDatabase() {
    // 1. Load users
    const usersRes = await this.pool.query('SELECT * FROM users');
    const rolesRes = await this.pool.query('SELECT * FROM roles');
    const rolePermissionsRes = await this.pool.query(`
      SELECT rp.role_id, p.name as permission_name 
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
    `);
    
    this.users = usersRes.rows.map(row => {
      const role = rolesRes.rows.find(r => r.id === row.role_id);
      const perms = rolePermissionsRes.rows
        .filter(rp => rp.role_id === row.role_id)
        .map(rp => rp.permission_name);
      return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        firstName: row.first_name,
        lastName: row.last_name,
        roleId: row.role_id,
        roleName: role ? role.name : 'viewer',
        permissions: perms,
        isActive: row.is_active,
        mustChangePassword: row.must_change_password,
      };
    });

    // 2. Load membership plans
    const plansRes = await this.pool.query('SELECT * FROM membership_plans');
    this.plans = plansRes.rows.map(row => ({
      id: row.id,
      name: row.name,
      price: row.price,
      durationDays: row.duration_days,
      description: row.description,
      isActive: row.is_active,
      isGroup: row.is_group || false,
      maxMembers: row.max_members || 1,
    }));

    // 3. Load members
    const membersRes = await this.pool.query('SELECT * FROM members WHERE deleted_at IS NULL');
    const photosRes = await this.pool.query('SELECT * FROM member_photos WHERE is_primary = TRUE AND deleted_at IS NULL');
    const notesRes = await this.pool.query('SELECT * FROM member_notes WHERE deleted_at IS NULL');
    
    this.members = membersRes.rows.map(row => {
      const photo = photosRes.rows.find(p => p.member_id === row.id);
      const mNotes = notesRes.rows.filter(n => n.member_id === row.id).map(n => n.note);
      const user = this.users.find(u => u.id === row.created_by);
      return {
        id: row.id,
        memberNumber: row.member_number,
        firstName: row.first_name,
        lastName: row.last_name,
        gender: row.gender,
        birthDate: row.birth_date ? row.birth_date.toISOString().split('T')[0] : '',
        email: row.email,
        phone: row.phone,
        street: row.street,
        number: row.number,
        city: row.city,
        state: row.state,
        postalCode: row.postal_code,
        emergencyContactName: row.emergency_contact_name,
        emergencyContactPhone: row.emergency_contact_phone,
        emergencyContactRelationship: row.emergency_contact_relationship,
        registrationDate: row.registration_date ? row.registration_date.toISOString().split('T')[0] : '',
        isActive: row.is_active,
        photoUrl: photo ? photo.photo_url : '',
        notes: mNotes,
        createdBy: row.created_by,
        createdByName: user ? `${user.firstName} ${user.lastName}` : 'Personal',
      };
    });

    // 4. Load memberships
    const membershipsRes = await this.pool.query('SELECT * FROM memberships WHERE deleted_at IS NULL');
    this.memberships = membershipsRes.rows.map(row => {
      const plan = this.plans.find(p => p.id === row.plan_id);
      return {
        id: row.id,
        memberId: row.member_id,
        planId: row.plan_id,
        planName: plan ? plan.name : 'Membresía',
        startDate: row.start_date ? row.start_date.toISOString().split('T')[0] : '',
        endDate: row.end_date ? row.end_date.toISOString().split('T')[0] : '',
        status: row.status,
        parentMembershipId: row.parent_membership_id || undefined,
      };
    });

    // 5. Load payments
    const paymentsRes = await this.pool.query('SELECT * FROM payments WHERE deleted_at IS NULL');
    const paymentMethodsRes = await this.pool.query('SELECT * FROM payment_methods');
    this.payments = paymentsRes.rows.map(row => {
      const method = paymentMethodsRes.rows.find(m => m.id === row.payment_method_id);
      const user = this.users.find(u => u.id === row.processed_by);
      return {
        id: row.id,
        memberId: row.member_id,
        membershipId: row.membership_id,
        paymentMethodId: row.payment_method_id,
        paymentMethodName: method ? method.name : 'Efectivo',
        amount: row.amount,
        referenceNumber: row.reference_number,
        paymentDate: row.payment_date ? row.payment_date.toISOString() : '',
        status: row.status,
        processedBy: row.processed_by,
        processedByName: user ? `${user.firstName} ${user.lastName}` : 'Personal',
      };
    });

    // 6. Load access logs
    const logsRes = await this.pool.query('SELECT * FROM access_logs ORDER BY scanned_at DESC');
    this.accessLogs = logsRes.rows.map(row => {
      const member = this.members.find(m => m.id === row.member_id);
      const ms = this.memberships.find(m => m.memberId === row.member_id && m.status === 'ACTIVE');
      return {
        id: row.id,
        memberId: row.member_id,
        memberName: member ? `${member.firstName} ${member.lastName}` : 'Persona Desconocida',
        memberNumber: member ? member.memberNumber : 'DESCONOCIDO',
        photoUrl: member ? member.photoUrl : '',
        membershipType: ms ? ms.planName : 'N/A',
        membershipEndDate: ms ? ms.endDate : 'N/A',
        accessGranted: row.access_granted,
        failureReason: row.failure_reason,
        scannedAt: row.scanned_at ? row.scanned_at.toISOString() : '',
      };
    });

    // 7. Load documents
    const docsRes = await this.pool.query('SELECT * FROM member_documents WHERE deleted_at IS NULL');
    this.documents = docsRes.rows.map(row => ({
      id: row.id,
      memberId: row.member_id,
      summary: row.summary,
      fileData: row.file_path,
      mimeType: row.mime_type,
      uploadedAt: row.uploaded_at ? row.uploaded_at.toISOString() : '',
    }));

    console.log(`Successfully synced PostgreSQL: ${this.users.length} users, ${this.members.length} members, ${this.plans.length} plans, ${this.memberships.length} memberships, ${this.payments.length} payments, ${this.accessLogs.length} access logs, ${this.documents.length} docs.`);
  }

  loadMockBackup() {
    this.users = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'goldencorpsgym@gmail.com',
        passwordHash: createHash('sha256').update('Golden#2026').digest('hex'),
        firstName: 'Angie',
        lastName: 'Garfias',
        roleId: '1a3b5c7d-9e11-4433-88bb-66cc77dd8801',
        roleName: 'owner',
        permissions: ['create:users', 'manage:memberships', 'manage:payments', 'manage:access', 'view:reports', 'system:config'],
        isActive: true,
        mustChangePassword: true,
      },
    ];
  }

  async saveUser(user: User) {
    await this.pool.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role_id, is_active, must_change_password)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        email = $2,
        password_hash = $3,
        first_name = $4,
        last_name = $5,
        role_id = $6,
        is_active = $7,
        must_change_password = $8,
        updated_at = CURRENT_TIMESTAMP
    `, [user.id, user.email, user.passwordHash, user.firstName, user.lastName, user.roleId, user.isActive, user.mustChangePassword]);
  }

  async saveMember(member: Member) {
    await this.pool.query(`
      INSERT INTO members (id, member_number, first_name, last_name, gender, birth_date, email, phone, street, number, city, state, postal_code, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO UPDATE SET
        first_name = $3,
        last_name = $4,
        gender = $5,
        birth_date = $6,
        email = $7,
        phone = $8,
        street = $9,
        number = $10,
        city = $11,
        state = $12,
        postal_code = $13,
        emergency_contact_name = $14,
        emergency_contact_phone = $15,
        emergency_contact_relationship = $16,
        is_active = $17,
        updated_at = CURRENT_TIMESTAMP
    `, [
      member.id,
      member.memberNumber,
      member.firstName,
      member.lastName,
      member.gender,
      member.birthDate || null,
      member.email || null,
      member.phone,
      member.street || null,
      member.number || null,
      member.city || null,
      member.state || null,
      member.postalCode || null,
      member.emergencyContactName || null,
      member.emergencyContactPhone || null,
      member.emergencyContactRelationship || null,
      member.isActive,
      member.createdBy || null
    ]);

    if (member.photoUrl) {
      await this.pool.query('DELETE FROM member_photos WHERE member_id = $1', [member.id]);
      await this.pool.query(`
        INSERT INTO member_photos (member_id, photo_url, is_primary)
        VALUES ($1, $2, TRUE)
      `, [member.id, member.photoUrl]);
    }

    await this.pool.query('DELETE FROM member_notes WHERE member_id = $1', [member.id]);
    if (member.notes && member.notes.length > 0) {
      const adminId = '11111111-1111-1111-1111-111111111111';
      for (const note of member.notes) {
        await this.pool.query(`
          INSERT INTO member_notes (member_id, author_id, note)
          VALUES ($1, $2, $3)
        `, [member.id, adminId, note]);
      }
    }
  }

  async savePlan(plan: MembershipPlan) {
    await this.pool.query(`
      INSERT INTO membership_plans (id, name, price, duration_days, description, is_active, is_group, max_members)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        name = $2,
        price = $3,
        duration_days = $4,
        description = $5,
        is_active = $6,
        is_group = $7,
        max_members = $8,
        updated_at = CURRENT_TIMESTAMP
    `, [plan.id, plan.name, plan.price, plan.durationDays, plan.description, plan.isActive, plan.isGroup ?? false, plan.maxMembers ?? 1]);
  }

  async saveMembership(membership: Membership) {
    await this.pool.query(`
      INSERT INTO memberships (id, member_id, plan_id, start_date, end_date, status, parent_membership_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        status = $6,
        start_date = $4,
        end_date = $5,
        parent_membership_id = $7,
        updated_at = CURRENT_TIMESTAMP
    `, [membership.id, membership.memberId, membership.planId, membership.startDate || null, membership.endDate || null, membership.status, membership.parentMembershipId || null]);
  }

  async savePayment(payment: Payment) {
    await this.pool.query(`
      INSERT INTO payments (id, member_id, membership_id, payment_method_id, amount, reference_number, payment_date, status, processed_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        status = $8,
        updated_at = CURRENT_TIMESTAMP
    `, [payment.id, payment.memberId, payment.membershipId, payment.paymentMethodId, payment.amount, payment.referenceNumber, payment.paymentDate || null, payment.status, payment.processedBy]);
  }

  async saveAccessLog(log: AccessLog) {
    await this.pool.query(`
      INSERT INTO access_logs (id, member_id, access_granted, failure_reason, scanned_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO NOTHING
    `, [log.id, log.memberId || null, log.accessGranted, log.failureReason || null, log.scannedAt || null]);
  }

  async saveDocument(doc: MemberDocument) {
    await this.pool.query(`
      INSERT INTO member_documents (id, member_id, summary, file_path, mime_type, uploaded_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        summary = $3,
        file_path = $4,
        mime_type = $5
    `, [doc.id, doc.memberId, doc.summary, doc.fileData, doc.mimeType, doc.uploadedAt || null]);
  }

  async deleteDocument(docId: string) {
    await this.pool.query('DELETE FROM member_documents WHERE id = $1', [docId]);
  }
}


