# Golden Corps Gym - Agente de Escritorio para Lector Biométrico

Este proyecto contiene el **WebSocket Bridge Daemon** (en C# .NET 8) que actúa como puente de comunicación local entre el lector de huellas USB ZKTeco (ZK9500/ZK4500) y la consola web de administración del gimnasio.

---

## Requisitos de Ejecución
1. **Lector Biométrico**: Lector USB ZKTeco (ZKTeco ZK9500 o similar).
2. **Drivers**: El controlador USB provisto por ZKTeco (`setup.exe` de la carpeta `ZKFingerSDK_Windows_Standard`).
3. **Entorno de Ejecución**: .NET 8.0 SDK (Windows 10 / 11 mini PC).

---

## Cómo Compilar y Ejecutar

### Paso 1: Instalar los Drivers Oficiales
Ejecutar el archivo `setup.exe` provisto en el SDK oficial para instalar los controladores a nivel de sistema operativo y registrar `libzkfp.dll` en la ruta de librerías del sistema.

### Paso 2: Compilar el Agente
Abre una terminal PowerShell o CMD en la carpeta `/biometric-agent` y ejecuta el comando de compilación:

```bash
dotnet build
```

O publica un ejecutable autocontenido listo para producción para la computadora de la recepción:

```bash
dotnet publish -c Release -r win-x64 --self-contained true /p:PublishSingleFile=true
```

### Paso 3: Ejecutar el Agente
Una vez publicado, ejecuta el archivo `BiometricAgent.exe`. El agente:
1. Conectará con el lector físico USB en el índice 0.
2. Iniciará un servidor WebSocket local en el puerto `ws://localhost:9000`.

---

## Protocolo WebSocket

### 1. Iniciar Enrolamiento (Desde Vue 3 hacia el Agente)
**Mensaje enviado**:
```json
{
  "action": "enroll",
  "memberId": "UUID_DEL_MIEMBRO",
  "fingerIndex": 1
}
```

**Flujo de Respuestas del Agente**:
* **Paso 1**: `{ "status": "scanning", "count": 1 }` (Coloque el dedo primera vez)
* **Paso 2**: `{ "status": "scanning", "count": 2 }` (Coloque el dedo segunda vez)
* **Paso 3**: `{ "status": "scanning", "count": 3 }` (Coloque el dedo tercera vez)
* **Completado**: `{ "status": "success", "template": "BASE64_BLOB", "fingerIndex": 1 }` (Enviado al unificar las lecturas)
* **Error**: `{ "status": "error", "message": "Descripción del error..." }`

---

## Versionamiento en el Repositorio
* **SÍ SE VERSIONA**: El código de este agente (`Program.cs`, `BiometricAgent.csproj` y este `README.md`) para mantener control de versiones sobre los mensajes de red y flujos del sensor.
* **NO SE VERSIONA**: Instaladores pesados (`setup.exe`) o binarios DLL generados al compilar (`/bin`, `/obj`).
