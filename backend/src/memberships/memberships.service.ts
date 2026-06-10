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

  assignPlan(memberId: string, planId: string): Membership {
    const plan = this.db.plans.find((p) => p.id === planId);
    if (!plan) {
      throw new NotFoundException('Membership plan not found');
    }

    // Check if there's already an active membership.
    // If active, renew starts at the end of the active membership.
    const active = this.findActiveMembership(memberId);
    let startDateStr = new Date().toISOString().split('T')[0];

    if (active) {
      const activeEndDate = new Date(active.endDate);
      activeEndDate.setDate(activeEndDate.getDate() + 1);
      startDateStr = activeEndDate.toISOString().split('T')[0];
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(startDateStr);
    endDate.setDate(startDate.getDate() + plan.durationDays);

    const newMembership: Membership = {
      id: randomUUID(),
      memberId,
      planId,
      planName: plan.name,
      startDate: startDateStr,
      endDate: endDate.toISOString().split('T')[0],
      status: 'PENDING', // Initially pending until payment is registered
    };

    this.db.memberships.push(newMembership);
    return newMembership;
  }

  cancelMembership(id: string): Membership {
    const ms = this.db.memberships.find((m) => m.id === id);
    if (!ms) {
      throw new NotFoundException('Membership not found');
    }
    ms.status = 'CANCELLED';
    return ms;
  }

  activateMembership(id: string): Membership {
    const ms = this.db.memberships.find((m) => m.id === id);
    if (!ms) {
      throw new NotFoundException('Membership not found');
    }
    ms.status = 'ACTIVE';
    return ms;
  }

  updatePlan(id: string, updateData: Partial<MembershipPlan>): MembershipPlan {
    const plan = this.db.plans.find((p) => p.id === id);
    if (!plan) {
      throw new NotFoundException('Membership plan not found');
    }
    if (updateData.name !== undefined) plan.name = updateData.name;
    if (updateData.price !== undefined) plan.price = updateData.price;
    if (updateData.durationDays !== undefined) plan.durationDays = updateData.durationDays;
    if (updateData.description !== undefined) plan.description = updateData.description;
    if (updateData.isActive !== undefined) plan.isActive = updateData.isActive;
    return plan;
  }

  updateMembership(id: string, updateData: Partial<Membership>): Membership {
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
    return ms;
  }
}
