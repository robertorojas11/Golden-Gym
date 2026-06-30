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

  async assignPlan(memberId: string, planId: string, customStartDate?: string): Promise<Membership> {
    const plan = this.db.plans.find((p) => p.id === planId);
    if (!plan) {
      throw new NotFoundException('Membership plan not found');
    }

    // Check if there is already an active membership.
    // If active, it cannot be assigned to another different plan.
    const activePlan = this.db.memberships.find(
      (m) => m.memberId === memberId && m.status === 'ACTIVE'
    );

    if (activePlan && activePlan.planId !== planId) {
      throw new BadRequestException('El miembro ya tiene un plan activo. No se puede asignar un plan diferente.');
    }

    // Cancel any existing PENDING memberships so they are overwritten
    const existingPending = this.db.memberships.filter(
      (m) => m.memberId === memberId && m.status === 'PENDING'
    );
    for (const pm of existingPending) {
      pm.status = 'CANCELLED';
      await this.db.saveMembership(pm);
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
    
    // Day counts has to exclude Sundays!
    let addedDays = 0;
    while (addedDays < plan.durationDays) {
      endDate.setDate(endDate.getDate() + 1);
      if (endDate.getDay() !== 0) { // 0 is Sunday
        addedDays++;
      }
    }

    // If start date is in the past (migration of old users), auto-activate without pending payment
    const todayStr = new Date().toISOString().split('T')[0];
    const isPastDate = startDateStr < todayStr;

    const newMembership: Membership = {
      id: randomUUID(),
      memberId,
      planId,
      planName: plan.name,
      startDate: startDateStr,
      endDate: endDate.toISOString().split('T')[0],
      status: isPastDate ? 'ACTIVE' : 'PENDING',
    };

    this.db.memberships.push(newMembership);
    await this.db.saveMembership(newMembership);
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
}
