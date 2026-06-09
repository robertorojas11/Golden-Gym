import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { MockDatabase, Payment, Membership } from '../mock-db';

@Injectable()
export class PaymentsService {
  constructor(private db: MockDatabase) {}

  findAll(): Payment[] {
    return this.db.payments;
  }

  findMemberPayments(memberId: string): Payment[] {
    return this.db.payments.filter((p) => p.memberId === memberId);
  }

  registerPayment(paymentData: {
    memberId: string;
    membershipId: string;
    paymentMethodId: string;
    amount: number;
    referenceNumber?: string;
    processedBy: string;
  }): Payment {
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
      id: crypto.randomUUID(),
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

    this.db.payments.push(newPayment);

    // Update membership status to ACTIVE
    ms.status = 'ACTIVE';

    return newPayment;
  }

  refundPayment(id: string): Payment {
    const payment = this.db.payments.find((p) => p.id === id);
    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    if (payment.status === 'REFUNDED') {
      throw new BadRequestException('Payment has already been refunded');
    }

    payment.status = 'REFUNDED';

    // Update related membership to CANCELLED
    const ms = this.db.memberships.find((m) => m.id === payment.membershipId);
    if (ms) {
      ms.status = 'CANCELLED';
    }

    return payment;
  }
}
