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

## 2. Default Owner Login Credentials

The system initializes with a default owner/administrator account. On first login, you are required to change this password:

* **Email**: `goldencorpsgym@gmail.com`
* **Temporary Password**: `Golden#2026`
* **Rules for new password**: At least 8 characters, at least one number, and at least one special character (e.g. `@`, `#`, `$`, etc.).

Additional receptionist, supervisor, or trainer accounts can be created and managed via the **Administración de Personal** view by owners.

---

## 3. Operations Workflow

### A. Registering a Member
1. Click **Nuevo Miembro** from the top header of the **Directorio de Miembros** page.
2. Complete personal information (First/Last name, phone, birthday, gender, email).
3. (Optional) Provide address details, emergency contact information, and specific trainer notes.
4. **Profile Photo**: 
   * Click **Subir Archivo** to choose a pre-existing image file.
   * Click **Usar Cámara** to start the local webcam feed, and press **Tomar Foto** to snap a snapshot.
5. Click **Guardar Perfil** to persist the profile to PostgreSQL.

### B. Assigning a Membership Plan
1. Select a member from the sidebar list in the **Members** view.
2. Click **Asignar Plan** on the member profile dashboard.
3. Select the desired plan (e.g. Monthly Standard).
4. Initially, status is set to `PENDING` until a payment is registered.

### C. Registering a Payment
1. Click **$ Registrar Pago** from the quick actions or payments tab.
2. Select the member and their pending membership plan.
3. Choose the payment method (Cash, Debit Card, Credit Card, Transfer) and amount.
4. Click **Record Payment**. The membership status automatically transitions to `ACTIVE`.

### D. Registering Attendance (Receptionist Check-In Console)
The biometrics scanner simulation has been replaced by a manual access registry interface for receptionist convenience:
1. Navigate to the **Control de Acceso** view.
2. In the right panel under **Asistencia Manual**, type the member's name, surname, or folio (ID) into the member search input.
3. Select the desired member from the dropdown results.
4. Click **Registrar Entrada Manual**.
5. The console will transition:
   * **Success**: Shows a green welcome message showing the member's name and remaining active plan days.
   * **Access Denied**: Shows a red warning if the membership is expired or the member is unrecognized.
6. Click **Siguiente Registro** or wait 40 seconds to reset the console.

### E. Member Documents Vault
1. Select a member in the directory and click the **Documentos** tab.
2. Choose a PDF file (e.g. signed contract, medical certificate) using the file uploader.
3. Add a short summary or description of the document.
4. Click **Subir Documento** to archive it into the Postgres database.
5. View, download, or delete uploaded documents instantly from the document list.

### F. Staff Administration (Owners Only)
1. Navigate to the **Administración de Personal** panel.
2. View all active and inactive staff members.
3. Click **Nuevo Personal** to create a receptionist, gerency manager, or trainer account (assigned a default temporary password).
4. Reset password or change role/details at any time by clicking **Editar** on their entry.
5. Deactivate or reactivate accounts to restrict system access immediately.
