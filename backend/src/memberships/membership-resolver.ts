import type { Membership } from '../mock-db';

/** Selects the membership that must drive both access eligibility and display data. */
export function resolveMembershipForAccess(
  memberships: Membership[], memberId: string, today: string,
): Membership | undefined {
  const byLatestEndDate = (a: Membership, b: Membership) =>
    b.endDate.localeCompare(a.endDate) || b.startDate.localeCompare(a.startDate) || b.id.localeCompare(a.id);
  const candidates = memberships.filter((membership) => membership.memberId === memberId);
  return candidates.filter((membership) =>
    membership.status === 'ACTIVE' && membership.startDate <= today && membership.endDate > today,
  ).sort(byLatestEndDate)[0] || candidates.sort(byLatestEndDate)[0];
}
