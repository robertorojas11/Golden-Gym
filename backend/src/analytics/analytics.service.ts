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
    // 1. Accesos diarios de la semana actual (Lunes a Domingo)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
    const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const dailyAccesses = dayNames.map((name, index) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + index);
      const dayStr = dayDate.toISOString().split('T')[0];

      const count = this.db.accessLogs.filter((log) => {
        return log.scannedAt.startsWith(dayStr) && log.accessGranted;
      }).length;

      return { date: name, count };
    });

    // 2. Ingresos mensuales del año actual (Pesos Mexicanos MXN)
    const currentYear = new Date().getFullYear();
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthlyRevenue = monthNames.map((name, index) => {
      const monthNumStr = String(index + 1).padStart(2, '0');
      const yearMonthStr = `${currentYear}-${monthNumStr}`;

      const amountCents = this.db.payments
        .filter((p) => p.paymentDate.startsWith(yearMonthStr) && p.status === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0);

      return { month: name, amount: amountCents / 100 };
    });

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

    const today = new Date().toISOString().split('T')[0];
    const upcomingExpirations = this.db.memberships
      .filter((m) => m.status === 'ACTIVE' && m.endDate >= today)
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
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
