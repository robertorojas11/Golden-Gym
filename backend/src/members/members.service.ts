import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MockDatabase, Member } from '../mock-db';

@Injectable()
export class MembersService {
  constructor(private db: MockDatabase) {}

  findAll() {
    return this.db.members
      .filter((m) => m.isActive !== false)
      .map((m) => {
        const activeMembership = this.db.memberships.find(
          (ms) => ms.memberId === m.id && ms.status === 'ACTIVE',
        );
        return {
          ...m,
          activePlanId: activeMembership?.planId || null,
          activePlanName: activeMembership?.planName || null,
          hasActiveMembership: !!activeMembership,
        };
      });
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
      .filter(
        (m) =>
          m.isActive !== false &&
          (m.firstName.toLowerCase().includes(q) ||
            m.lastName.toLowerCase().includes(q) ||
            m.memberNumber.toLowerCase().includes(q) ||
            m.phone.includes(q) ||
            m.email?.toLowerCase().includes(q)),
      )
      .map((m) => {
        const activeMembership = this.db.memberships.find(
          (ms) => ms.memberId === m.id && ms.status === 'ACTIVE',
        );
        return {
          ...m,
          activePlanId: activeMembership?.planId || null,
          activePlanName: activeMembership?.planName || null,
          hasActiveMembership: !!activeMembership,
        };
      });
  }

  create(memberData: Partial<Member>, userId?: string): Member {
    const nextNum = 1000 + this.db.members.length + 1;
    const user = userId ? this.db.users.find((u) => u.id === userId) : undefined;
    const newMember: Member = {
      id: randomUUID(),
      memberNumber: `MEM-${nextNum}`,
      firstName: memberData.firstName || '',
      lastName: memberData.lastName || '',
      gender: memberData.gender || 'Male',
      birthDate: memberData.birthDate || '',
      email: memberData.email || '',
      phone: memberData.phone || '',
      street: memberData.street || '',
      number: memberData.number || '',
      city: memberData.city || '',
      state: memberData.state || '',
      postalCode: memberData.postalCode || '',
      emergencyContactName: memberData.emergencyContactName || '',
      emergencyContactPhone: memberData.emergencyContactPhone || '',
      emergencyContactRelationship: memberData.emergencyContactRelationship || '',
      registrationDate: new Date().toISOString().split('T')[0],
      isActive: true,
      photoUrl: memberData.photoUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${memberData.firstName}`,
      notes: memberData.notes || [],
      createdBy: userId || '33333333-3333-3333-3333-333333333333',
      createdByName: user ? `${user.firstName} ${user.lastName}` : 'Lucas Vance',
    };
    this.db.members.push(newMember);
    return newMember;
  }

  update(id: string, updateData: Partial<Member>, userId?: string): Member {
    const member = this.findOne(id);
    const user = userId ? this.db.users.find((u) => u.id === userId) : undefined;
    Object.assign(member, {
      ...updateData,
      updatedBy: userId,
      updatedByName: user ? `${user.firstName} ${user.lastName}` : undefined,
    });
    return member;
  }

  deactivate(id: string): Member {
    const member = this.findOne(id);
    member.isActive = false;
    return member;
  }

  addNote(id: string, note: string): Member {
    const member = this.findOne(id);
    if (!member.notes) {
      member.notes = [];
    }
    member.notes.push(note);
    return member;
  }
}
