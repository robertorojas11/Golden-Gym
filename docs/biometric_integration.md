# Biometric Hardware Integration Plan - Gym Access Control

This document outlines how to bridge the software system with real USB fingerprint scanners (e.g. DigitalPersona U.are.U 4500, SecuGen Hamster, or Suprema BioMini) in future development phases.

---

## 1. Hardware Communication Architecture

Web applications inside a browser cannot query USB hardware ports directly. To resolve this boundary, choose one of the following integration paths:

### Option A: Local WebSocket Daemon (Recommended)
Develop a lightweight native service running on the host system (e.g., in Python or C# using the scanner SDK).
```
[USB Scanner] ➔ [Local Python/C# Daemon] ➔ (WebSocket server: ws://localhost:9000) ➔ [Vue 3 SPA client]
```
- **Pros**: Easy to deploy on reception desktops; does not require exposing hardware nodes inside Docker container spaces.
- **Cons**: Requires installing a small background service on the local machine outside Docker.

### Option B: Node Native Bindings in Backend
Mount the USB bus inside the backend Docker container (e.g., mapping `/dev/bus/usb` on Linux hosts) and use native Node modules:
- Use `node-usb` or dynamic linker packages like `ffi-napi` to load the vendor `.so` or `.dll` library.
- Expose the device handles directly to the NestJS Biometrics Service.

---

## 2. API Schema Compatibility

The biometrics module is designed to accept replacement hardware inputs. The scanner daemon should post to the existing `/biometric/scan` endpoint:
```json
{
  "fingerprintTemplate": "BASE64_ENROLLED_MINUTIAE_DATA",
  "deviceSerial": "DP-4500-1288A"
}
```
The NestJS controller can then process this template using matching algorithms (e.g., ISO/IEC 19794-2 minutiae comparison) against base64 strings saved in the `member_photos` or a new `member_biometrics` table.
.
