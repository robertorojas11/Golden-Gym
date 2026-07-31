import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MockDatabase, Member, getMXDate, capitalizeWords } from '../mock-db';
import { resolveMembershipForAccess } from '../memberships/membership-resolver';

@Injectable()
export class MembersService {
  constructor(private db: MockDatabase) {}

  private toSummary(member: Member) {
    const today = getMXDate();
    const resolved = resolveMembershipForAccess(this.db.memberships, member.id, today);
    const active = resolved?.status === 'ACTIVE' && resolved.startDate <= today && resolved.endDate > today
      ? resolved : undefined;
    return {
      id: member.id,
      memberNumber: member.memberNumber,
      firstName: member.firstName,
      lastName: member.lastName,
      gender: member.gender,
      email: member.email,
      phone: member.phone,
      registrationDate: member.registrationDate,
      isActive: member.isActive,
      noPaymentRequired: member.noPaymentRequired,
      hasPhoto: !!member.photoUrl,
      activePlanId: active?.planId || null,
      activePlanName: active?.planName || null,
      hasActiveMembership: !!active,
    };
  }

  findAll() {
    return this.db.members.map((member) => this.toSummary(member));
  }

  findOne(id: string): Member {
    const member = this.db.members.find((m) => m.id === id);
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    return member;
  }

  search(query: string) {
    const q = query.toLowerCase();
    return this.db.members
      .filter((member) =>
        member.firstName.toLowerCase().includes(q) ||
        member.lastName.toLowerCase().includes(q) ||
        member.memberNumber.toLowerCase().includes(q) ||
        member.phone.includes(q) ||
        member.email?.toLowerCase().includes(q),
      )
      .map((member) => this.toSummary(member));
  }

  async create(memberData: Partial<Member>, userId?: string): Promise<Member> {
    // Check for exact duplicate member to avoid double-submit duplication
    const duplicate = this.db.members.find(
      (m) =>
        m.firstName.trim().toLowerCase() === (memberData.firstName || '').trim().toLowerCase() &&
        m.lastName.trim().toLowerCase() === (memberData.lastName || '').trim().toLowerCase() &&
        m.birthDate === memberData.birthDate
    );
    if (duplicate) {
      throw new BadRequestException('Ya existe un miembro registrado con el mismo nombre, apellido y fecha de nacimiento.');
    }

    // Get maximum existing member number suffix to skip deleted/existing gaps
    let maxNum = 1000;
    for (const m of this.db.members) {
      const match = m.memberNumber.match(/(\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxNum) {
          maxNum = val;
        }
      }
    }
    const nextNum = maxNum + 1;
    const user = userId ? this.db.users.find((u) => u.id === userId) : undefined;
    const newMember: Member = {
      id: randomUUID(),
      memberNumber: `MEM-${nextNum}`,
      firstName: capitalizeWords(memberData.firstName),
      lastName: capitalizeWords(memberData.lastName),
      gender: memberData.gender || 'Male',
      birthDate: memberData.birthDate || '',
      email: memberData.email || '',
      phone: memberData.phone || '',
      street: memberData.street || '',
      number: memberData.number || '',
      city: memberData.city || '',
      state: memberData.state || '',
      postalCode: memberData.postalCode || '',
      emergencyContactName: capitalizeWords(memberData.emergencyContactName),
      emergencyContactPhone: memberData.emergencyContactPhone || '',
      emergencyContactRelationship: memberData.emergencyContactRelationship || '',
      registrationDate: getMXDate(),
      isActive: true,
      noPaymentRequired: memberData.noPaymentRequired === true,
      photoUrl: memberData.photoUrl || '',
      notes: memberData.notes || [],
      createdBy: userId || '33333333-3333-3333-3333-333333333333',
      createdByName: user ? `${user.firstName} ${user.lastName}` : 'Lucas Vance',
    };
    this.db.members.push(newMember);
    await this.db.saveMember(newMember, { photoChanged: true, notesChanged: true });
    return newMember;
  }

  async update(id: string, updateData: Partial<Member>, userId?: string): Promise<Member> {
    const member = this.findOne(id);
    const user = userId ? this.db.users.find((u) => u.id === userId) : undefined;
    
    if (updateData.firstName !== undefined) updateData.firstName = capitalizeWords(updateData.firstName);
    if (updateData.lastName !== undefined) updateData.lastName = capitalizeWords(updateData.lastName);
    if (updateData.emergencyContactName !== undefined) updateData.emergencyContactName = capitalizeWords(updateData.emergencyContactName);

    const photoChanged = Object.prototype.hasOwnProperty.call(updateData, 'photoUrl');
    delete updateData.notes;
    Object.assign(member, {
      ...updateData,
      updatedBy: userId,
      updatedByName: user ? `${user.firstName} ${user.lastName}` : undefined,
    });
    await this.db.saveMember(member, { photoChanged });
    return member;
  }

  async deactivate(id: string): Promise<Member> {
    const member = this.findOne(id);
    member.isActive = false;
    await this.db.saveMember(member);
    return member;
  }

  async addNote(id: string, note: string): Promise<Member> {
    const member = this.findOne(id);
    if (!member.notes) {
      member.notes = [];
    }
    member.notes.push(note);
    await this.db.saveMemberNote(member.id, note);
    return member;
  }

  findDocuments(memberId: string) {
    return this.db.documents
      .filter((d) => d.memberId === memberId)
      .map(({ fileData, ...metadata }) => metadata);
  }

  findDocument(memberId: string, docId: string) {
    const document = this.db.documents.find((d) => d.id === docId && d.memberId === memberId);
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  async addDocument(memberId: string, data: { summary: string; fileData: string; mimeType?: string }) {
    this.findOne(memberId); // Throws if member not found
    const newDoc = {
      id: randomUUID(),
      memberId,
      summary: data.summary,
      fileData: data.fileData,
      mimeType: data.mimeType || 'application/pdf',
      uploadedAt: new Date().toISOString(),
    };
    this.db.documents.push(newDoc);
    await this.db.saveDocument(newDoc);
    const { fileData, ...metadata } = newDoc;
    return metadata;
  }

  async deleteDocument(memberId: string, docId: string) {
    const idx = this.db.documents.findIndex((d) => d.id === docId && d.memberId === memberId);
    if (idx === -1) {
      throw new NotFoundException('Document not found');
    }
    this.db.documents.splice(idx, 1);
    await this.db.deleteDocument(docId);
    return { success: true };
  }
}
