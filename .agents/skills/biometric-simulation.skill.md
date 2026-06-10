# Skill: Biometric Simulation
This skill defines standard procedures, APIs, and interfaces to simulate hardware-based biometric verification.

---

## 1. Purpose
In the absence of a physical USB fingerprint scanner during initial deployment/testing, the system simulates fingerprint scans, matches profiles, and returns verification results to test the full pipeline.

## 2. Business Rules
1. **Simulation API Endpoint**: `POST /biometric/scan`
2. **Scan Payload**:
   - `memberId` (optional): To simulate a specific member checking in.
   - `forceResult` (optional): Set to `"success"`, `"denied_expired"`, or `"denied_unknown"` to force particular simulation flows.
3. **Scan Flow**:
   - **Scanning Phase**: Delay of 1.5 seconds to simulate finger placement and optical capture.
   - **Matching Phase**: Query the member profile by ID (or pick a random one if not provided).
   - **Validation Phase**: Check membership status (Active vs. Expired).
4. **Mock API Response**:
   ```json
   {
     "memberId": "uuid-here",
     "matched": true,
     "confidence": 98.4,
     "accessGranted": true,
     "reason": "Membership Active"
   }
   ```

## 3. Data Flow
```
[Frontend Scan Trigger]
       │
       ▼ (HTTP POST /biometric/scan)
[NestJS BiometricController]
       │
       ├─► (Check mock database / seeds)
       │
       ▼ (Calculate access validity)
[Write to access_logs]
       │
       ▼ (Return HTTP Response)
[Frontend update states and show animations]
```

## 4. UI Expectations
- A "Simulate Fingerprint Scan" widget is available to receptionists or on the access screen.
- A glowing fingerprint icon that pulses red/green/yellow depending on the state of the scan.

## 5. Future Expansion
- Replace the NestJS Simulation service with a native Node-API wrapper (such as `node-ffi` or native C++ bindings) interacting with SDKs like DigitalPersona or SecuGen.
