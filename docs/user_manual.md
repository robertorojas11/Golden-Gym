# User Manual & Operator Guide - Gym Access Control (v1)

This manual guides gym receptionists and system administrators through configuring and running the prototype.

---

## 1. Quick Start (Docker Launch)

To boot the system, open a terminal in the project root directory and run:
```bash
docker-compose up --build -d
```
Once initialized, open your web browser and navigate to:
- Frontend Client: `http://localhost`
- API Backend docs: `http://localhost/api` (or `http://localhost:3000`)

---

## 2. Default Login Credentials

Use the following staff accounts to log in and test different RBAC permission configurations:

| Role | Email | Password | Allowed Actions |
| :--- | :--- | :--- | :--- |
| **Owner** | `owner@goldengym.local` | `Password123` | Full access, user creation, config settings |
| **Administrator** | `admin@goldengym.local` | `Password123` | Plan setups, member assignments, payments |
| **Receptionist** | `reception@goldengym.local` | `Password123` | Member signups, scans, recording payments |

---

## 3. Operations Workflow

### A. Registering a Member
1. Click **+ Register Member** in the top right.
2. Complete personal info (First/Last name, phone, birthday).
3. (Optional) Provide address details, emergency contacts, and trainer notes.
4. Click **Save Profile**.

### B. Assigning a Membership Plan
1. Select a member from the sidebar in the **Members** view.
2. Click **Assign Plan** on the dashboard or Member details page.
3. Select the desired plan (e.g. Monthly Standard).
4. Initially, status is set to `PENDING` until a payment is registered.

### C. Registering a Payment
1. Click **$ Register Payment** from the quick actions.
2. Select the member and their pending membership plan.
3. Choose the payment method (Cash, Debit Card, Credit Card, Transfer) and amount.
4. Click **Record Payment**. The membership status automatically transitions to `ACTIVE`.

### D. Simulating a Fingerprint Scan
1. Navigate to the **Access Control** screen.
2. The scanner is initially in `Ready for Verification` (waiting state).
3. On the right-side panel, use the **Biometric Simulator** buttons to fire events:
   - **Simulate Scan (Roberto)**: Simulates a valid match, showing a green checkmark and welcome card.
   - **Simulate Scan (John Doe)**: Simulates an expired membership match, showing a red alarm warning.
   - **Simulate Unknown Finger**: Simulates scanning a finger not registered to any profile, raising a match failure alarm.
