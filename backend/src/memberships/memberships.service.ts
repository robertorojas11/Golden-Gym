import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MockDatabase, Membership, MembershipPlan } from '../mock-db';

@Injectable()
export class MembershipsService {
  constructor(private db: MockDatabase) {}

  findAllPlans(): MembershipPlan[] {
    return this.db.plans;
  }

  findMemberMemberships(memberId: string): Membership[] {
    return this.db.memberships.filter((m) => m.memberId === memberId);
  }

  findActiveMembership(memberId: string): Membership | undefined {
    const today = new Date().toISOString().split('T')[0];
    return this.db.memberships.find(
      (m) =>
        m.memberId === memberId &&
        m.status === 'ACTIVE' &&
        m.startDate <= today &&
        m.endDate >= today,
    );
  }

  async assignPlan(memberId: string, planId: string, customStartDate?: string, additionalMemberIds?: string[]): Promise<Membership> {
    const plan = this.db.plans.find((p) => p.id === planId);
    if (!plan) {
      throw new NotFoundException('Membership plan not found');
    }

    // Check if there is already an active membership.
    const todayStr = new Date().toISOString().split('T')[0];
    const activePlan = this.db.memberships.find(
      (m) => m.memberId === memberId && m.status === 'ACTIVE' && m.endDate >= todayStr
    );

    if (activePlan) {
      throw new BadRequestException('El miembro principal ya tiene un plan activo. No se puede asignar otro plan hasta que este expire o sea cancelado.');
    }

    // Check additional members active plans
    if (additionalMemberIds && additionalMemberIds.length > 0) {
      for (const addId of additionalMemberIds) {
        const activeAdd = this.db.memberships.find(
          (m) => m.memberId === addId && m.status === 'ACTIVE' && m.endDate >= todayStr
        );
        if (activeAdd) {
          const addMember = this.db.members.find(m => m.id === addId);
          const addName = addMember ? `${addMember.firstName} ${addMember.lastName}` : addId;
          throw new BadRequestException(`El miembro adicional ${addName} ya tiene un plan activo. No se puede vincular a otro plan.`);
        }
      }
    }

    // Cancel any existing PENDING memberships for the main member so they are overwritten
    const existingPending = this.db.memberships.filter(
      (m) => m.memberId === memberId && m.status === 'PENDING'
    );
    for (const pm of existingPending) {
      pm.status = 'CANCELLED';
      await this.db.saveMembership(pm);
    }

    // Cancel any existing PENDING memberships for additional members
    if (additionalMemberIds && additionalMemberIds.length > 0) {
      for (const addId of additionalMemberIds) {
        const existingPendingAdd = this.db.memberships.filter(
          (m) => m.memberId === addId && m.status === 'PENDING'
        );
        for (const pm of existingPendingAdd) {
          pm.status = 'CANCELLED';
          await this.db.saveMembership(pm);
        }
      }
    }

    const active = this.findActiveMembership(memberId);
    let startDateStr = customStartDate || new Date().toISOString().split('T')[0];

    if (active && !customStartDate) {
      const activeEndDate = new Date(active.endDate);
      activeEndDate.setDate(activeEndDate.getDate() + 1);
      startDateStr = activeEndDate.toISOString().split('T')[0];
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(startDateStr);
    
    // Count Sundays to calculate end date (standard calendar days)
    endDate.setDate(startDate.getDate() + plan.durationDays);

    // If start date is in the past (migration of old users), auto-activate without pending payment
    const isPastDate = startDateStr < todayStr;
    const mainMember = this.db.members.find((m) => m.id === memberId);
    const noPaidRequired = mainMember?.noPaymentRequired === true;

    const newMembership: Membership = {
      id: randomUUID(),
      memberId,
      planId,
      planName: plan.name,
      startDate: startDateStr,
      endDate: endDate.toISOString().split('T')[0],
      status: (isPastDate || noPaidRequired) ? 'ACTIVE' : 'PENDING',
    };

    this.db.memberships.push(newMembership);
    await this.db.saveMembership(newMembership);

    // Save child memberships if it's a group plan
    if (plan.isGroup && additionalMemberIds && additionalMemberIds.length > 0) {
      const limit = (plan.maxMembers || 1) - 1;
      const selectedAddIds = additionalMemberIds.slice(0, limit);
      for (const addId of selectedAddIds) {
        const childMs: Membership = {
          id: randomUUID(),
          memberId: addId,
          planId,
          planName: plan.name,
          startDate: startDateStr,
          endDate: newMembership.endDate,
          status: newMembership.status,
          parentMembershipId: newMembership.id,
        };
        this.db.memberships.push(childMs);
        await this.db.saveMembership(childMs);
      }
    }

    return newMembership;
  }

  async cancelMembership(id: string): Promise<Membership> {
    const ms = this.db.memberships.find((m) => m.id === id);
    if (!ms) {
      throw new NotFoundException('Membership not found');
    }
    ms.status = 'CANCELLED';
    await this.db.saveMembership(ms);
    return ms;
  }

  async activateMembership(id: string): Promise<Membership> {
    const ms = this.db.memberships.find((m) => m.id === id);
    if (!ms) {
      throw new NotFoundException('Membership not found');
    }
    ms.status = 'ACTIVE';
    await this.db.saveMembership(ms);
    return ms;
  }

  async createPlan(planData: Partial<MembershipPlan>): Promise<MembershipPlan> {
    const newPlan: MembershipPlan = {
      id: randomUUID(),
      name: planData.name || '',
      price: planData.price || 0,
      durationDays: planData.durationDays || 30,
      description: planData.description || '',
      isActive: planData.isActive !== false,
      isGroup: planData.isGroup === true,
      maxMembers: planData.maxMembers || 1,
    };
    this.db.plans.push(newPlan);
    await this.db.savePlan(newPlan);
    return newPlan;
  }

  async updatePlan(id: string, updateData: Partial<MembershipPlan>): Promise<MembershipPlan> {
    const plan = this.db.plans.find((p) => p.id === id);
    if (!plan) {
      throw new NotFoundException('Membership plan not found');
    }
    if (updateData.name !== undefined) plan.name = updateData.name;
    if (updateData.price !== undefined) plan.price = updateData.price;
    if (updateData.durationDays !== undefined) plan.durationDays = updateData.durationDays;
    if (updateData.description !== undefined) plan.description = updateData.description;
    if (updateData.isActive !== undefined) plan.isActive = updateData.isActive;
    if (updateData.isGroup !== undefined) plan.isGroup = updateData.isGroup;
    if (updateData.maxMembers !== undefined) plan.maxMembers = updateData.maxMembers;
    await this.db.savePlan(plan);
    return plan;
  }

  async updateMembership(id: string, updateData: Partial<Membership>): Promise<Membership> {
    const ms = this.db.memberships.find((m) => m.id === id);
    if (!ms) {
      throw new NotFoundException('Membership not found');
    }
    if (updateData.startDate !== undefined) ms.startDate = updateData.startDate;
    if (updateData.endDate !== undefined) ms.endDate = updateData.endDate;
    if (updateData.status !== undefined) ms.status = updateData.status;
    if (updateData.planId !== undefined) {
      const plan = this.db.plans.find((p) => p.id === updateData.planId);
      if (plan) {
        ms.planId = plan.id;
        ms.planName = plan.name;
      }
    }
    await this.db.saveMembership(ms);
    return ms;
  }

  findAllMemberships(): Membership[] {
    return this.db.memberships;
  }
}
