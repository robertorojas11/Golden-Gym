import { Injectable } from '@nestjs/common';
import { MockDatabase } from '../mock-db';

@Injectable()
export class AnalyticsService {
  constructor(private db: MockDatabase) {}

  getSummary() {
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysFromNowStr = sevenDaysFromNow.toISOString().split('T')[0];

    const activeMembers = this.db.members.filter((m) => m.isActive).length;

    const activeMembershipsList = this.db.memberships.filter((m) => m.status === 'ACTIVE');
    const expiringMemberships = activeMembershipsList.filter(
      (m) => m.endDate >= todayStr && m.endDate <= sevenDaysFromNowStr,
    ).length;

    const expiredMemberships = this.db.memberships.filter((m) => m.status === 'EXPIRED').length;

    // Accesos de hoy
    const todayAccesses = this.db.accessLogs.filter((l) => {
      const scanDate = l.scannedAt.split('T')[0];
      return scanDate === todayStr && l.accessGranted;
    }).length;

    // Ingresos mensuales (Pesos Mexicanos MXN)
    const currentMonth = todayStr.substring(0, 7); // "2026-06"
    const monthlyRevenueCents = this.db.payments
      .filter((p) => p.paymentDate.startsWith(currentMonth) && p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0);

    const newMembersThisMonth = this.db.members.filter((m) =>
      m.registrationDate.startsWith(currentMonth),
    ).length;

    return {
      activeMembers,
      expiringMemberships,
      expiredMemberships,
      todayAccesses,
      monthlyRevenue: monthlyRevenueCents / 100, // en MXN
      newMembersThisMonth,
    };
  }

  getCharts() {
    // 1. Accesos diarios
    const dailyAccesses = [
      { date: 'Lun', count: 18 },
      { date: 'Mar', count: 24 },
      { date: 'Mié', count: 22 },
      { date: 'Jue', count: 30 },
      { date: 'Vie', count: 28 },
      { date: 'Sáb', count: 15 },
      { date: 'Dom', count: 8 },
    ];

    // 2. Ingresos por mes (en pesos MXN)
    const monthlyRevenue = [
      { month: 'Ene', amount: 4500 },
      { month: 'Feb', amount: 5200 },
      { month: 'Mar', amount: 6100 },
      { month: 'Abr', amount: 5800 },
      { month: 'May', amount: 7200 },
      { month: 'Jun', amount: 8500 },
      { month: 'Jul', amount: 0 },
      { month: 'Ago', amount: 0 },
      { month: 'Sep', amount: 0 },
      { month: 'Oct', amount: 0 },
      { month: 'Nov', amount: 0 },
      { month: 'Dic', amount: 0 },
    ];

    // 3. Distribución de membresías
    const distribution = [
      { name: 'Activa', value: this.db.memberships.filter((m) => m.status === 'ACTIVE').length },
      { name: 'Pendiente', value: this.db.memberships.filter((m) => m.status === 'PENDING').length },
      { name: 'Expirada', value: this.db.memberships.filter((m) => m.status === 'EXPIRED').length },
      { name: 'Cancelada', value: this.db.memberships.filter((m) => m.status === 'CANCELLED').length },
    ];

    return {
      dailyAccesses,
      monthlyRevenue,
      distribution,
    };
  }

  getRecentData() {
    const recentAccesses = this.db.accessLogs.slice(0, 5);
    const recentPayments = this.db.payments.slice(0, 5).map((p) => {
      const member = this.db.members.find((m) => m.id === p.memberId);
      return {
        id: p.id,
        memberName: member ? `${member.firstName} ${member.lastName}` : 'Desconocido',
        amount: p.amount / 100, // en MXN
        paymentDate: p.paymentDate,
        method: p.paymentMethodName,
        status: p.status,
      };
    });

    const upcomingExpirations = this.db.memberships
      .filter((m) => m.status === 'ACTIVE')
      .slice(0, 5)
      .map((m) => {
        const member = this.db.members.find((mem) => mem.id === m.memberId);
        return {
          id: m.id,
          memberName: member ? `${member.firstName} ${member.lastName}` : 'Desconocido',
          planName: m.planName,
          endDate: m.endDate,
        };
      });

    return {
      recentAccesses,
      recentPayments,
      upcomingExpirations,
    };
  }
}
