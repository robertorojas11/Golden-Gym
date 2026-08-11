import { Injectable } from '@nestjs/common';
import { MockDatabase, addDaysToDate, getMXDate } from '../mock-db';
import { resolveMembershipForAccess } from '../memberships/membership-resolver';

@Injectable()
export class AnalyticsService {
  constructor(private db: MockDatabase) {}

  private getLastMembershipPerMember() {
    const lastMembershipsMap = new Map<string, any>();
    // Sort ascending so the latest membership overwrites previous ones
    const sortedMemberships = [...this.db.memberships].sort((a, b) => {
      return a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate);
    });
    for (const m of sortedMemberships) {
      lastMembershipsMap.set(m.memberId, m);
    }
    return lastMembershipsMap;
  }

  getSummary(roleName?: string) {
    const todayStr = getMXDate();
    const sevenDaysFromNowStr = addDaysToDate(todayStr, 7);

    // Resolve the membership that is actually valid today. A future renewal must
    // not hide a currently active membership.
    const lastMemberships = Array.from(this.getLastMembershipPerMember().values());
    const activeMembershipsList = this.db.members
      .map((member) => resolveMembershipForAccess(this.db.memberships, member.id, todayStr))
      .filter((membership) => membership?.status === 'ACTIVE'
        && membership.startDate <= todayStr && membership.endDate > todayStr);
    const activeMembers = activeMembershipsList.length;
    
    const expiringMemberships = activeMembershipsList.filter(
      (m) => m.endDate > todayStr && m.endDate <= sevenDaysFromNowStr,
    ).length;

    const expiredMemberships = lastMemberships.filter((m) => m.status === 'EXPIRED').length;

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

    const summary: Record<string, number> = {
      activeMembers,
      expiringMemberships,
      expiredMemberships,
      todayAccesses,
      monthlyRevenue: monthlyRevenueCents / 100, // en MXN
      newMembersThisMonth,
    };
    if (roleName === 'administrator') delete summary.monthlyRevenue;
    return summary;
  }

  getCharts(roleName?: string) {
    // 1. Accesos diarios de la semana actual (Lunes a Domingo)
    const todayStr = getMXDate();
    const [year, month, day] = todayStr.split('-').map(Number);
    const today = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = today.getUTCDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
    const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const mondayStr = addDaysToDate(todayStr, -distanceToMonday);

    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const dailyAccesses = dayNames.map((name, index) => {
      const dayStr = addDaysToDate(mondayStr, index);

      const count = this.db.accessLogs.filter((log) => {
        return log.scannedAt.startsWith(dayStr) && log.accessGranted;
      }).length;

      return { date: name, count };
    });

    // 2. Ingresos mensuales del año actual (Pesos Mexicanos MXN)
    const currentYear = todayStr.slice(0, 4);
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
    const lastMemberships = Array.from(this.getLastMembershipPerMember().values());
    const distribution = [
      { name: 'Activa', value: lastMemberships.filter((m) => m.status === 'ACTIVE').length },
      { name: 'Pendiente', value: lastMemberships.filter((m) => m.status === 'PENDING').length },
      { name: 'Expirada', value: lastMemberships.filter((m) => m.status === 'EXPIRED').length },
      { name: 'Cancelada', value: lastMemberships.filter((m) => m.status === 'CANCELLED').length },
    ];

    const charts: Record<string, any[]> = {
      dailyAccesses,
      monthlyRevenue,
      distribution,
    };
    if (roleName === 'administrator') delete charts.monthlyRevenue;
    return charts;
  }

  getRecentData(roleName?: string, userId?: string) {
    const recentAccesses = this.db.accessLogs.slice(0, 5);
    const currentMonth = getMXDate().slice(0, 7);
    const visiblePayments = roleName === 'administrator'
      ? this.db.payments.filter((payment) =>
          payment.processedBy === userId && payment.paymentDate.startsWith(currentMonth),
        )
      : this.db.payments;
    const recentPayments = [...visiblePayments]
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
      .slice(0, 5)
      .map((p) => {
        const member = this.db.members.find((m) => m.id === p.memberId);
        return {
          id: p.id,
          memberId: p.memberId,
          memberName: member ? `${member.firstName} ${member.lastName}` : 'Desconocido',
          amount: p.amount / 100, // en MXN
          paymentDate: p.paymentDate,
          method: p.paymentMethodName,
          status: p.status,
        };
      });

    const today = getMXDate();
    const upcomingExpirations = this.db.memberships
      .filter((m) => m.status === 'ACTIVE' && m.endDate > today)
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .slice(0, 5)
      .map((m) => {
        const member = this.db.members.find((mem) => mem.id === m.memberId);
        return {
          id: m.id,
          memberId: m.memberId,
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
