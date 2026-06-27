# Biometric Hardware Integration Roadmap (ZKTeco ZK9500)

This document describes the implementation architecture for connecting the system to the **ZKTeco ZK9500 USB biometric scanner** using the official **ZKFinger SDK**.

---

## 1. ZKTeco ZK9500 SDK & Driver Details

The ZK9500 sensor communicates via USB and utilizes the **ZKFinger SDK** (available for Windows, Linux, and Android):
* **Driver**: ZKUsbKeeper / ZKFP driver.
* **Core Library**: `libzkfp.dll` (Windows) or `libzkfp.so` (Linux).
* **Minutiae Template Format**: Proprietary ZKFinger minutiae extraction templates (usually 512-byte or 1024-byte arrays represented as Base64 strings).

---

## 2. Hardware Bridge Architecture

Since standard browser security blocks direct access to local USB ports, a middleware daemon is required to communicate between the ZK9500 SDK and the web client.

```
[ZKTeco ZK9500 USB Scanner]
          │ (USB Serial connection)
          ▼
[Local Desktop WebSocket Daemon] (Python Ctypes / C# ZKFinger Wrapper)
          │
          ├─► Enrolls / extracts fingerprint templates (Base64 ANSI/ISO)
          │
          ▼ (Push event via WebSocket: ws://localhost:9000)
[Vue 3 SPA client (Access Control Console)]
          │ (Post request)
          ▼
[NestJS Monolithic API] ──► [PostgreSQL Database]
```

### Option A: Local WebSocket Daemon (Recommended for Windows 11 Mini PC)
Develop a simple background console application in C# or Python on the Intel Pentium Mini PC:
1. Load `libzkfp` DLL dynamic bindings.
2. Initialize the sensor hook: `ZKFP_Init()`.
3. Open a loop or event hook listening for the scan trigger.
4. When a finger is placed, capture the template array, convert it to a Base64 string, and push it through a local WebSocket server (`ws://localhost:9000`) to the Vue 3 check-in page.

---

## 3. Database & API Schema Mapping

The database schema includes support for associating member records with their enrolled biometric templates:

### 1. Registering/Enrolling a Fingerprint template:
When enrolling a member, the daemon sends 3 sequential scans to extract the reference template. The frontend sends this to:
`POST /members/:id/biometrics`
```json
{
  "templateData": "BASE64_ZKTECO_ENROLLED_TEMPLATE_BLOB",
  "fingerIndex": 1
}
```

### 2. Access Verification / Match:
When a member places their finger on the ZK9500 at the counter:
1. The daemon captures the quick template.
2. It sends the template to the NestJS API:
   `POST /biometric/scan`
   ```json
   {
     "fingerprintTemplate": "BASE64_ZKTECO_CURRENT_SCAN_BLOB"
   }
   ```
3. The NestJS backend loads active member templates from PostgreSQL and executes the ZKFinger match algorithm (`ZKFP_Match(regTemplate, scanTemplate)`) using a native DLL wrapper or delegates the match check to the local daemon before registering the entry log.
4. Upon successful match, it registers an access log entry (`accessLogs`) in PostgreSQL and returns the member's eligibility status.
