import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MockDatabase, Membership, MembershipPlan, addDaysToDate, getMXDate } from '../mock-db';
import { resolveMembershipForAccess } from './membership-resolver';

@Injectable()
export class MembershipsService {
  constructor(private db: MockDatabase) {}

  findAllPlans(): MembershipPlan[] {
    return this.db.plans;
  }

  async findMemberMemberships(memberId: string): Promise<any[]> {
    await this.db.updateExpiredMemberships();
    const list = this.db.memberships.filter((m) => m.memberId === memberId);
    return list.map((m) => {
      let parentMs = m;
      if (m.parentMembershipId) {
        const foundParent = this.db.memberships.find((x) => x.id === m.parentMembershipId);
        if (foundParent) {
          parentMs = foundParent;
        }
      }
      const children = this.db.memberships.filter((child) => child.parentMembershipId === parentMs.id);
      
      let remainingBalance = 0;
      let appliedDiscount = parentMs.discount || 0;
      if (m.status === 'PENDING') {
        const plan = this.db.plans.find((p) => p.id === parentMs.planId);
        if (plan) {
          const payments = this.db.payments.filter((p) => p.membershipId === parentMs.id);
          const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
          const totalDiscount = payments.reduce((sum, p) => sum + p.discount, 0);
          appliedDiscount += totalDiscount;
          remainingBalance = plan.price - appliedDiscount - totalPaid;
        }
      }

      return {
        ...m,
        groupParentMemberId: parentMs.memberId,
        beneficiaryIds: children.map((child) => child.memberId),
        remainingBalance,
        appliedDiscount,
      };
    });
  }

  async findActiveMembership(memberId: string): Promise<Membership | undefined> {
    await this.db.updateExpiredMemberships();
    const today = getMXDate();
    const resolved = resolveMembershipForAccess(this.db.memberships, memberId, today);
    return resolved?.status === 'ACTIVE' && resolved.startDate <= today && resolved.endDate > today
      ? resolved : undefined;
  }

  async assignPlan(memberId: string, planId: string, customStartDate?: string, additionalMemberIds?: string[]): Promise<any> {
    await this.db.updateExpiredMemberships();
    const plan = this.db.plans.find((p) => p.id === planId);
    if (!plan) {
      throw new NotFoundException('Membership plan not found');
    }

    const requestedAdditionalIds = [...new Set(additionalMemberIds || [])];
    if (requestedAdditionalIds.includes(memberId)) {
      throw new BadRequestException('El titular no puede agregarse también como beneficiario.');
    }
    if (!plan.isGroup && requestedAdditionalIds.length > 0) {
      throw new BadRequestException('Este plan no admite beneficiarios adicionales.');
    }
    const beneficiaryLimit = Math.max(0, (plan.maxMembers || 1) - 1);
    if (requestedAdditionalIds.length > beneficiaryLimit) {
      throw new BadRequestException(`Este plan admite un máximo de ${beneficiaryLimit} beneficiario(s).`);
    }

    // An active membership is valid input for a renewal. If no custom date is
    // supplied, the new membership is scheduled immediately after it ends.
    const todayStr = getMXDate();
    const previousMembership = [...this.db.memberships]
      .filter((m) => m.memberId === memberId && !m.parentMembershipId)
      .sort((a, b) => b.endDate.localeCompare(a.endDate) || b.startDate.localeCompare(a.startDate))[0];
    let inheritedDiscount = previousMembership?.discount || 0;
    if (previousMembership) {
      inheritedDiscount += this.db.payments
        .filter((payment) => payment.membershipId === previousMembership.id)
        .reduce((sum, payment) => sum + (payment.discount || 0), 0);
    }

    // Additional members may keep their current active plan when renewing the
    // same group. They cannot be moved from an unrelated active membership.
    if (requestedAdditionalIds.length > 0) {
      for (const addId of requestedAdditionalIds) {
        const addMember = this.db.members.find((member) => member.id === addId);
        if (!addMember || !addMember.isActive) {
          throw new BadRequestException('Todos los beneficiarios deben ser miembros vigentes.');
        }
        const activeAdd = this.db.memberships.find(
          (m) => m.memberId === addId && m.status === 'ACTIVE'
            && m.startDate <= todayStr && m.endDate > todayStr
        );
        if (activeAdd) {
          const activeParent = activeAdd.parentMembershipId
            ? this.db.memberships.find((m) => m.id === activeAdd.parentMembershipId)
            : activeAdd;
          const mainActive = this.db.memberships.find(
            (m) => m.memberId === memberId && m.status === 'ACTIVE' && m.endDate > todayStr
          );
          if (activeParent?.id === mainActive?.id) continue;
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
    if (requestedAdditionalIds.length > 0) {
      for (const addId of requestedAdditionalIds) {
        const existingPendingAdd = this.db.memberships.filter(
          (m) => m.memberId === addId && m.status === 'PENDING'
        );
        for (const pm of existingPendingAdd) {
          pm.status = 'CANCELLED';
          await this.db.saveMembership(pm);
        }
      }
    }

    const active = await this.findActiveMembership(memberId);
    let startDateStr = customStartDate || getMXDate();

    if (active && !customStartDate) {
      // endDate is exclusive throughout access validation, so the renewal
      // starts on that same date without introducing a one-day gap.
      startDateStr = active.endDate;
    }

    // Auto-activate ONLY if the custom start date is BEFORE the system start date (2026-06-29) - i.e. migrated old members
    const isMigratedDate = startDateStr < '2026-06-29';
    const mainMember = this.db.members.find((m) => m.id === memberId);
    const noPaidRequired = mainMember?.noPaymentRequired === true;

    const newMembership: Membership = {
      id: randomUUID(),
      memberId,
      planId,
      planName: plan.name,
      startDate: startDateStr,
      endDate: addDaysToDate(startDateStr, plan.durationDays),
      status: (isMigratedDate || noPaidRequired || inheritedDiscount >= plan.price) ? 'ACTIVE' : 'PENDING',
      discount: Math.min(inheritedDiscount, plan.price),
    };

    this.db.memberships.push(newMembership);
    await this.db.saveMembership(newMembership);

    const beneficiaryIds: string[] = [];

    // Save child memberships if it's a group plan
    if (plan.isGroup && requestedAdditionalIds.length > 0) {
      const selectedAddIds = requestedAdditionalIds.slice(0, beneficiaryLimit);
      for (const addId of selectedAddIds) {
        beneficiaryIds.push(addId);
        const childMs: Membership = {
          id: randomUUID(),
          memberId: addId,
          planId,
          planName: plan.name,
          startDate: startDateStr,
          endDate: newMembership.endDate,
          status: newMembership.status,
          parentMembershipId: newMembership.id,
          discount: newMembership.discount,
        };
        this.db.memberships.push(childMs);
        await this.db.saveMembership(childMs);
      }
    }

    return { ...newMembership, beneficiaryIds };
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

  async findAllMemberships(): Promise<Membership[]> {
    await this.db.updateExpiredMemberships();
    return this.db.memberships;
  }
}
