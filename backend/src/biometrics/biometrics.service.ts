import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MockDatabase, AccessLog, Member, getMXDate, getMXTimestamp } from '../mock-db';
import { resolveMembershipForAccess } from '../memberships/membership-resolver';

@Injectable()
export class BiometricsService {
  private scanRequests = new Map<string, Promise<any>>();

  constructor(private db: MockDatabase) {}

  scanFingerprint(body: { memberId?: string; forceResult?: string; scanId?: string }): Promise<any> {
    if (!body.scanId) return this.executeScan(body);
    const existing = this.scanRequests.get(body.scanId);
    if (existing) return existing;
    const request = this.executeScan(body);
    this.scanRequests.set(body.scanId, request);
    setTimeout(() => this.scanRequests.delete(body.scanId!), 10000);
    return request;
  }

  private async executeScan(body: { memberId?: string; forceResult?: string }): Promise<any> {
    // Simular el retraso del sensor biométrico (1 segundo)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    let matched = true;
    let confidence = Math.floor(88 + Math.random() * 11); // 88% - 99%
    let accessGranted = false;
    let failureReason: string | undefined = undefined;
    let member: Member | undefined = undefined;
    let resolvedMembership;

    if (body.forceResult === 'denied_unknown') {
      matched = false;
      confidence = Math.floor(30 + Math.random() * 20); // Baja confianza
      failureReason = 'HUELLA_NO_RECONOCIDA';
    } else {
      // Buscar miembro
      if (body.memberId) {
        member = this.db.members.find((m) => m.id === body.memberId);
      } else {
        // Seleccionar miembro aleatorio
        const idx = Math.floor(Math.random() * this.db.members.length);
        member = this.db.members[idx];
      }

      if (!member) {
        matched = false;
        confidence = 12;
        failureReason = 'MIEMBRO_NO_ENCONTRADO';
      } else {
        // Validar estatus de membresía activa
        await this.db.updateExpiredMemberships();
        const today = getMXDate();
        resolvedMembership = resolveMembershipForAccess(this.db.memberships, member.id, today);
        const hasActiveMembership = resolvedMembership?.status === 'ACTIVE' &&
          resolvedMembership.startDate <= today && resolvedMembership.endDate > today;

        if (body.forceResult === 'denied_expired') {
          accessGranted = false;
          failureReason = 'MEMBRESIA_EXPIRADA';
        } else if (!hasActiveMembership) {
          accessGranted = false;
          failureReason = 'MEMBRESIA_EXPIRADA';
        } else {
          accessGranted = true;
        }
      }
    }

    // Registrar bitácora de acceso
    const newLog: AccessLog = {
      id: randomUUID(),
      memberId: member?.id,
      memberName: member ? `${member.firstName} ${member.lastName}` : 'Persona Desconocida',
      memberNumber: member?.memberNumber || 'DESCONOCIDO',
      photoUrl: member?.photoUrl || '',
      membershipType: member ? resolvedMembership?.planName || 'Sin Plan' : 'N/A',
      membershipEndDate: member ? resolvedMembership?.endDate || 'N/A' : 'N/A',
      accessGranted,
      failureReason,
      scannedAt: getMXTimestamp(),
    };

    // Registrar bitácora de acceso (solo si es la primera del día para este miembro)
    let duplicateCheck = false;
    if (member && accessGranted) {
      const todayStr = getMXDate();
      duplicateCheck = this.db.accessLogs.some(
        (log) => log.memberId === member.id && log.accessGranted && log.scannedAt.startsWith(todayStr),
      );
    }

    if (!duplicateCheck) {
      this.db.accessLogs.unshift(newLog); // Añadir al inicio
      await this.db.saveAccessLog(newLog);
    }

    return {
      memberId: member?.id || null,
      memberName: member ? `${member.firstName} ${member.lastName}` : null,
      memberNumber: member?.memberNumber || null,
      photoUrl: member?.photoUrl || null,
      membershipType: newLog.membershipType,
      membershipEndDate: newLog.membershipEndDate,
      matched,
      confidence,
      accessGranted,
      failureReason,
    };
  }

  getAccessLogs(memberId?: string): AccessLog[] {
    if (memberId) {
      return this.db.accessLogs.filter((log) => log.memberId === memberId);
    }
    const todayStr = getMXDate();
    return this.db.accessLogs.filter((log) => log.scannedAt && log.scannedAt.startsWith(todayStr));
  }

  async registerFingerprint(memberId: string, fingerIndex: number, templateData: string) {
    return this.db.saveFingerprint({ memberId, fingerIndex, templateData });
  }

  async deleteFingerprint(memberId: string, fingerIndex: number) {
    return this.db.deleteFingerprint(memberId, fingerIndex);
  }

  getMemberFingerprints(memberId: string) {
    return this.db.fingerprints.filter((f) => f.memberId === memberId);
  }

  getAllFingerprints() {
    return this.db.fingerprints;
  }
}
