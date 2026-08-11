import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MockDatabase, Payment, Membership, getMXDate, getMXTimestamp } from '../mock-db';

@Injectable()
export class PaymentsService {
  constructor(private db: MockDatabase) {}

  findAll(): any[] {
    return this.db.payments.map((p) => {
      const user = this.db.users.find((u) => u.id === p.processedBy);
      const member = this.db.members.find((m) => m.id === p.memberId);
      const membership = this.db.memberships.find((m) => m.id === p.membershipId);
      const plan = membership ? this.db.plans.find((candidate) => candidate.id === membership.planId) : undefined;
      const children = this.db.memberships.filter((m) => m.parentMembershipId === p.membershipId);
      const beneficiaries = children.map((c) => {
        const m = this.db.members.find((mem) => mem.id === c.memberId);
        return m ? `${m.firstName} ${m.lastName}` : 'Desconocido';
      });
      return {
        ...p,
        processedByName: user ? `${user.firstName} ${user.lastName}` : 'Desconocido',
        processedByRole: user?.roleName || null,
        memberName: member ? `${member.firstName} ${member.lastName}` : 'Desconocido',
        memberNumber: member ? member.memberNumber : 'N/A',
        planId: plan?.id || membership?.planId || null,
        planName: plan?.name || membership?.planName || 'Sin plan',
        beneficiaries,
      };
    });
  }

  findMemberPayments(memberId: string): any[] {
    return this.db.payments
      .filter((p) => p.memberId === memberId)
      .map((p) => {
        const user = this.db.users.find((u) => u.id === p.processedBy);
        const member = this.db.members.find((m) => m.id === p.memberId);
        const membership = this.db.memberships.find((m) => m.id === p.membershipId);
        const plan = membership ? this.db.plans.find((candidate) => candidate.id === membership.planId) : undefined;
        const children = this.db.memberships.filter((m) => m.parentMembershipId === p.membershipId);
        const beneficiaries = children.map((c) => {
          const m = this.db.members.find((mem) => mem.id === c.memberId);
          return m ? `${m.firstName} ${m.lastName}` : 'Desconocido';
        });
        return {
          ...p,
          processedByName: user ? `${user.firstName} ${user.lastName}` : 'Desconocido',
          processedByRole: user?.roleName || null,
          memberName: member ? `${member.firstName} ${member.lastName}` : 'Desconocido',
          memberNumber: member ? member.memberNumber : 'N/A',
          planId: plan?.id || membership?.planId || null,
          planName: plan?.name || membership?.planName || 'Sin plan',
          beneficiaries,
        };
      });
  }

  async registerPayment(paymentData: {
    memberId: string;
    membershipId: string;
    paymentMethodId: string;
    amount: number;
    discount?: number;
    referenceNumber?: string;
    processedBy: string;
  }): Promise<any> {
    // Check if membership exists
    const ms = this.db.memberships.find((m) => m.id === paymentData.membershipId);
    if (!ms) {
      throw new NotFoundException('Membership not found');
    }

    // Resolve group parent if it's a child membership (bill split)
    let billingMs = ms;
    if (ms.parentMembershipId) {
      const parent = this.db.memberships.find((m) => m.id === ms.parentMembershipId);
      if (parent) {
        billingMs = parent;
      }
    }

    if (billingMs.status !== 'PENDING') {
      throw new BadRequestException('La membresía ya se encuentra pagada, cancelada o vencida. Solo se pueden cobrar membresías pendientes.');
    }

    // Validate discount
    const plan = this.db.plans.find((p) => p.id === billingMs.planId);
    if (!plan) {
      throw new NotFoundException('Membership plan not found');
    }

    const discount = paymentData.discount || 0;
    if (discount < 0) {
      throw new BadRequestException('El descuento no puede ser negativo.');
    }

    // Calculate existing payments and discounts for this billing entity
    const existingPayments = this.db.payments.filter((p) => p.membershipId === billingMs.id);
    const totalPaidSoFar = existingPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalDiscountSoFar = (billingMs.discount || 0)
      + existingPayments.reduce((sum, p) => sum + p.discount, 0);

    if (totalDiscountSoFar + discount > plan.price) {
      throw new BadRequestException('El descuento total no puede ser mayor al precio de la membresía.');
    }

    const remainingBalance = plan.price - (totalDiscountSoFar + discount) - totalPaidSoFar;

    if (paymentData.amount <= 0) {
      throw new BadRequestException('El monto pagado debe ser mayor a 0.');
    }
    if (paymentData.amount > remainingBalance) {
      throw new BadRequestException(`El monto pagado excede el saldo pendiente de $${remainingBalance / 100} MXN.`);
    }

    // Resolve payment method name
    let methodName = 'Cash';
    if (paymentData.paymentMethodId === '90000000-0000-0000-0000-000000000002') methodName = 'Debit Card';
    if (paymentData.paymentMethodId === '90000000-0000-0000-0000-000000000003') methodName = 'Credit Card';
    if (paymentData.paymentMethodId === '90000000-0000-0000-0000-000000000004') methodName = 'Transfer';
    if (paymentData.paymentMethodId === '90000000-0000-0000-0000-000000000005') methodName = 'Pago Mixto';

    const newPayment: Payment = {
      id: randomUUID(),
      memberId: paymentData.memberId,
      membershipId: billingMs.id, // Store parent membership ID for consistent billing aggregation
      paymentMethodId: paymentData.paymentMethodId,
      paymentMethodName: methodName,
      amount: paymentData.amount,
      discount: discount,
      referenceNumber: paymentData.referenceNumber || `REF-${Math.floor(1000000 + Math.random() * 9000000)}`,
      paymentDate: getMXTimestamp(),
      status: 'PAID',
      processedBy: paymentData.processedBy,
    };

    const user = this.db.users.find((u) => u.id === newPayment.processedBy);
    newPayment.processedByName = user ? `${user.firstName} ${user.lastName}` : 'Desconocido';

    this.db.payments.push(newPayment);
    await this.db.savePayment(newPayment);

    // Update memberships status to ACTIVE only if fully paid
    const children = this.db.memberships.filter((m) => m.parentMembershipId === billingMs.id);
    const isFullyPaid = (paymentData.amount === remainingBalance);
    if (isFullyPaid) {
      billingMs.status = 'ACTIVE';
      await this.db.saveMembership(billingMs);

      for (const child of children) {
        child.status = 'ACTIVE';
        await this.db.saveMembership(child);
      }
    }

    const member = this.db.members.find((m) => m.id === newPayment.memberId);
    const beneficiaries = children.map((c) => {
      const m = this.db.members.find((mem) => mem.id === c.memberId);
      return m ? `${m.firstName} ${m.lastName}` : 'Desconocido';
    });

    return {
      ...newPayment,
      memberName: member ? `${member.firstName} ${member.lastName}` : 'Desconocido',
      memberNumber: member ? member.memberNumber : 'N/A',
      beneficiaries,
      isFullyPaid,
    };
  }

  findByUser(userId: string): any[] {
    return this.findAll().filter((p) => p.processedBy === userId);
  }

  filterForUserAndCurrentMonth(payments: any[], userId: string): any[] {
    const currentMonth = getMXDate().slice(0, 7);
    return payments.filter((payment) =>
      payment.processedBy === userId && payment.paymentDate.startsWith(currentMonth),
    );
  }

  findByUserForCurrentMonth(userId: string): any[] {
    return this.filterForUserAndCurrentMonth(this.findAll(), userId);
  }
}
