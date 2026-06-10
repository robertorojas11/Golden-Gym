# Business Rules - Gym Access Control System (v1)

This document establishes core business rules governing operations like membership status, check-in validation, and financial updates.

---

## 1. Access Validation Rules

During a biometric scan event:
1. **Active Check**: The system must check if the member has an active membership plan (today's date is between the membership start and end date).
2. **Access Grace Period**: There is no grace period for expired plans. Once expired, access status must return `ACCESS_DENIED`.
3. **Scan Frequency Limit**: To prevent tailgating or double scans, a member cannot register more than one entry every 5 minutes unless manually overridden by the receptionist.
4. **Log Entries**: Every check-in attempt (whether granted or denied) must write a row to the `access_logs` table, storing the member ID, the result (granted/denied), entry time, and the denial reason if applicable.

---

## 2. Membership Management Rules

1. **Duration Standards**:
   - Daily: 1 day
   - Weekly: 7 days
   - Monthly: 30 days
   - Quarterly: 90 days
   - Semiannual: 180 days
   - Annual: 365 days
2. **Overlapping Memberships**: A member cannot have two active memberships simultaneously. Renewing an active membership must set the new start date exactly one day after the current active membership ends.
3. **Cancellation Policy**: Cancelling a membership sets `deleted_at` (soft delete) or records a cancellation date, but does not delete previous historical memberships.

---

## 3. Financial and Payment Rules

1. **Payment Methods**: Only four payment types are allowed: `Cash`, `Debit Card`, `Credit Card`, and `Transfer`.
2. **Payment Lifecycle**:
   - A membership is not considered "Active" until a payment of matching amount is registered (unless specifically marked as a free promotional membership by an `owner`).
   - Refunds require the original payment ID. Refunding a payment must set the corresponding membership status to `Cancelled`.
3. **Currency**: The default currency is USD (or standard local currency) stored as decimal or integer cents in the database to avoid rounding errors.
