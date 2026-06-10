# Skill: Payment Management
This skill outlines how payments are registered, refunded, and reconciled.

---

## 1. Purpose
Keep audit-ready records of all financial transactions within the gym, supporting multiple localized payment types.

## 2. Business Rules
1. **Allowed Payment Methods**: `Cash`, `Debit Card`, `Credit Card`, and `Transfer`.
2. **Transaction Integrity**:
   - Payments must be linked to a specific member ID and membership ID.
   - Refunding a payment marks the payment as refunded and sets the associated membership status to `CANCELLED`.
3. **Receipting**: Generate a localized transaction reference containing the timestamp, operator user ID, and payment method details.

## 3. Data Flow
1. Receptionist clicks "Register Payment" for a pending membership.
2. Selects payment method (e.g. `Cash`) and enters the amount.
3. System saves the transaction to `payments`.
4. System updates the status of the associated `memberships` row to `ACTIVE`.
5. An audit log is generated detailing the collection.

## 4. UI Expectations
- Cash drawer interface showing quick payment actions.
- List of transactions with filters for payment method, date range, and operator.
- Metric indicators for Today's Revenue and Monthly Revenue.

## 5. Future Expansion
- Integration with local payment terminals (via USB, Bluetooth, or local API) for direct card charging, removing manual receptionist entry.
