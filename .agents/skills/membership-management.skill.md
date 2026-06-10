# Skill: Membership Management
This skill outlines how memberships plans are created, assigned, renewed, and canceled.

---

## 1. Purpose
Define the commercial parameters of gym access (duration, price, tier) and maintain the relationship between members and purchased plans over time.

## 2. Business Rules
1. **Plan Durations**:
   - Daily (1 day), Weekly (7 days), Monthly (30 days), Quarterly (90 days), Semiannual (180 days), Annual (365 days).
2. **Renewal Mechanics**:
   - If a member has a membership expiring on `YYYY-MM-DD`, a renewed membership starts on `YYYY-MM-DD + 1`.
   - If a membership is already expired, the renewal starts immediately on the payment registration date.
3. **History Logging**:
   - Every contract change, purchase, or refund writes to `membership_history` to maintain a historical log of plans the member has held.

## 3. Data Flow
1. Admin selects a member and clicks "Assign Plan".
2. System displays available `membership_plans`.
3. Admin selects a plan -> NestJS creates a new `memberships` row with start and end dates.
4. An entry in `membership_history` is written logging the assignment.
5. Membership status is initially marked as `PENDING` until a payment is registered.

## 4. UI Expectations
- Plan management screen containing cards for Daily, Weekly, Monthly, and Annual rates.
- Member profile page showing "Current Plan" with duration indicators, progress bar, and "Renew Plan" button.

## 5. Future Expansion
- Auto-billing triggers using localized merchant processing terminal integrations (e.g. smart terminals) for automatic card renewals.
.
