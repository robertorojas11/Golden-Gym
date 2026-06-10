# Skill: Access Control Check-in
This skill defines verification checks, timing rules, and database logging when a member checks into the facility.

---

## 1. Purpose
Validate a member's right to enter the gym facility based on their fingerprint ID match and membership status, writing all checks to the transaction logs.

## 2. Business Rules
1. **Access Authorization Check**:
   - Status must be `active`.
   - Start Date <= Current Date <= End Date.
   - Profile must not be flagged for suspension.
2. **Access Denial Cases**:
   - `EXPIRED_MEMBERSHIP`: Plan has reached its end date.
   - `SUSPENDED_MEMBER`: Admin flag set on member card.
   - `UNKNOWN_FINGERPRINT`: Biometric match confidence is below 80%.
   - `DUPLICATE_ENTRY`: Member scanned within the past 5 minutes.
3. **Database Logging**:
   - Create an entry in the `access_logs` table containing: `id`, `member_id`, `access_granted` (boolean), `failure_reason`, and `scanned_at`.

## 3. Data Flow
1. Fingerprint is scanned -> maps to Member ID.
2. Query database for Member details and their current Active membership.
3. If valid -> write `access_logs(granted=true)` -> return payload to front-end to show checkmark.
4. If invalid -> write `access_logs(granted=false, reason=...)` -> return payload to front-end to show alert.

## 4. UI Expectations
- Fullscreen dashboard showing large checkmark with a green ring for success.
- Display member name, membership type (e.g. "Monthly Plus"), and days remaining.
- Display warning alerts if the membership is expiring in <= 3 days.

## 5. Future Expansion
- Integration with relay boards (e.g. Raspberry Pi GPIO, USB relay, or IP-based controllers) to physically trigger turnstiles or electromagnetic locks upon successful access.
