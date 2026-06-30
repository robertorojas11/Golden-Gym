import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MockDatabase, Payment, Membership } from '../mock-db';

@Injectable()
export class PaymentsService {
  constructor(private db: MockDatabase) {}

  findAll(): any[] {
    return this.db.payments.map((p) => {
      const user = this.db.users.find((u) => u.id === p.processedBy);
      const member = this.db.members.find((m) => m.id === p.memberId);
      return {
        ...p,
        processedByName: user ? `${user.firstName} ${user.lastName}` : 'Desconocido',
        memberName: member ? `${member.firstName} ${member.lastName}` : 'Desconocido',
        memberNumber: member ? member.memberNumber : 'N/A',
      };
    });
  }

  findMemberPayments(memberId: string): any[] {
    return this.db.payments
      .filter((p) => p.memberId === memberId)
      .map((p) => {
        const user = this.db.users.find((u) => u.id === p.processedBy);
        const member = this.db.members.find((m) => m.id === p.memberId);
        return {
          ...p,
          processedByName: user ? `${user.firstName} ${user.lastName}` : 'Desconocido',
          memberName: member ? `${member.firstName} ${member.lastName}` : 'Desconocido',
          memberNumber: member ? member.memberNumber : 'N/A',
        };
      });
  }

  async registerPayment(paymentData: {
    memberId: string;
    membershipId: string;
    paymentMethodId: string;
    amount: number;
    referenceNumber?: string;
    processedBy: string;
  }): Promise<Payment> {
    // Check if membership exists
    const ms = this.db.memberships.find((m) => m.id === paymentData.membershipId);
    if (!ms) {
      throw new NotFoundException('Membership not found');
    }

    // Resolve payment method name
    let methodName = 'Cash';
    if (paymentData.paymentMethodId === '90000000-0000-0000-0000-000000000002') methodName = 'Debit Card';
    if (paymentData.paymentMethodId === '90000000-0000-0000-0000-000000000003') methodName = 'Credit Card';
    if (paymentData.paymentMethodId === '90000000-0000-0000-0000-000000000004') methodName = 'Transfer';

    const newPayment: Payment = {
      id: randomUUID(),
      memberId: paymentData.memberId,
      membershipId: paymentData.membershipId,
      paymentMethodId: paymentData.paymentMethodId,
      paymentMethodName: methodName,
      amount: paymentData.amount,
      referenceNumber: paymentData.referenceNumber || `REF-${Math.floor(1000000 + Math.random() * 9000000)}`,
      paymentDate: new Date().toISOString(),
      status: 'PAID',
      processedBy: paymentData.processedBy,
    };

    const user = this.db.users.find((u) => u.id === newPayment.processedBy);
    newPayment.processedByName = user ? `${user.firstName} ${user.lastName}` : 'Desconocido';

    this.db.payments.push(newPayment);
    await this.db.savePayment(newPayment);

    // Update membership status to ACTIVE
    ms.status = 'ACTIVE';
    await this.db.saveMembership(ms);

    return newPayment;
  }


}
