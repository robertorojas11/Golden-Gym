using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using Fleck;
using Newtonsoft.Json;
using libzkfpcsharp; // Managed ZK wrapper assembly

namespace BiometricAgent
{
    class Program
    {
        private static IntPtr devHandle = IntPtr.Zero;
        private static IntPtr dbHandle = IntPtr.Zero;
        private static bool isRunning = true;
        private static bool verifyCaptureArmed = true;
        private static List<IWebSocketConnection> activeSockets = new List<IWebSocketConnection>();

        // For enrollment process
        private static bool isEnrollMode = false;
        private static int enrollFingerIndex = -1;
        private static string enrollMemberId = "";
        private static int enrollStep = 0;
        private static byte[][] enrollTemplates = new byte[3][];

        private static int mfpWidth = 0;
        private static int mfpHeight = 0;
        private static byte[] fpBuffer = Array.Empty<byte>();

        // Local cache mapping SDK's integer ID (fid) to member string UUID and finger slot index
        class FingerprintInfo
        {
            public string MemberId { get; set; } = "";
            public int FingerIndex { get; set; }
        }
        private static Dictionary<int, FingerprintInfo> fingerprintMap = new Dictionary<int, FingerprintInfo>();
        private static string serverUrl = "http://localhost:3000"; // Dynamic URL mapping

        static async Task Main(string[] args)
        {
            Console.WriteLine("=====================================================");
            Console.WriteLine(" Golden Corps Gym - Biometric Local WebSocket Agent ");
            Console.WriteLine("=====================================================");

            // Resolve dynamic server hostname if passed in command args, otherwise fallback
            if (args != null && args.Length > 0 && args[0] != null && args[0].StartsWith("http"))
            {
                serverUrl = args[0];
            }

            // 1. Initialize ZK SDK through managed wrapper
            try
            {
                int initResult = zkfp2.Init();
                if (initResult != zkfperrdef.ZKFP_ERR_OK)
                {
                    Console.WriteLine($"[-] ERROR: No se pudo inicializar el SDK (código: {initResult}).");
                    Console.WriteLine("    Asegúrese de instalar los drivers oficiales ZKTeco.");
                }
                else
                {
                    int count = zkfp2.GetDeviceCount();
                    Console.WriteLine($"[+] Lector USB ZK detectado: {count} dispositivo(s).");
                    if (count > 0)
                    {
                        devHandle = zkfp2.OpenDevice(0);
                        if (devHandle != IntPtr.Zero)
                        {
                            dbHandle = zkfp2.DBInit();
                            
                            // Query dimensions
                            byte[] paramValue = new byte[4];
                            int size = 4;
                            zkfp2.GetParameters(devHandle, 1, paramValue, ref size);
                            zkfp2.ByteArray2Int(paramValue, ref mfpWidth);

                            size = 4;
                            zkfp2.GetParameters(devHandle, 2, paramValue, ref size);
                            zkfp2.ByteArray2Int(paramValue, ref mfpHeight);

                            fpBuffer = new byte[mfpWidth * mfpHeight];

                            Console.WriteLine($"[+] Conexión establecida con el escáner biométrico USB (Resolución: {mfpWidth}x{mfpHeight}).");

                            // Synchronize templates from server
                            await SyncTemplates();
                        }
                        else
                        {
                            Console.WriteLine("[-] ERROR: No se pudo abrir el dispositivo biométrico USB.");
                        }
                    }
                    else
                    {
                        Console.WriteLine("[!] ADVERTENCIA: No hay ningún lector físico conectado.");
                        Console.WriteLine("    El agente permanecerá en modo simulación para WebSockets.");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[-] Error cargando libzkfpcsharp o libzkfp.dll: {ex.Message}");
                Console.WriteLine("    Modo simulación activado.");
            }

            // 2. Start WebSocket Server
            var server = new WebSocketServer("ws://0.0.0.0:9000");
            server.Start(socket =>
            {
                socket.OnOpen = () =>
                {
                    Console.WriteLine($"[+] Cliente web conectado: {socket.ConnectionInfo.ClientIpAddress}");
                    activeSockets.Add(socket);
                };
                socket.OnClose = () =>
                {
                    Console.WriteLine($"[-] Cliente web desconectado: {socket.ConnectionInfo.ClientIpAddress}");
                    activeSockets.Remove(socket);
                    if (isEnrollMode) ResetEnrollment();
                };
                socket.OnMessage = message =>
                {
                    ProcessClientMessage(socket, message);
                };
            });

            Console.WriteLine("[+] Servidor WebSocket local iniciado en ws://localhost:9000");
            Console.WriteLine("[*] Presione CTRL+C para detener el agente.");

            // 3. Start sensor polling loop if device is open
            if (devHandle != IntPtr.Zero)
            {
                Thread pollThread = new Thread(PollSensorLoop);
                pollThread.IsBackground = true;
                pollThread.Start();
            }

            // Keep program running
            while (isRunning)
            {
                await Task.Delay(1000);
            }

            // Clean up
            if (devHandle != IntPtr.Zero) zkfp2.CloseDevice(devHandle);
            if (dbHandle != IntPtr.Zero) zkfp2.DBFree(dbHandle);
            zkfp2.Terminate();
        }

        private static async Task SyncTemplates()
        {
            if (dbHandle == IntPtr.Zero) return;

            try
            {
                using (var client = new HttpClient())
                {
                    Console.WriteLine($"[*] Sincronizando huellas dactilares desde: {serverUrl}/biometric/templates");
                    var response = await client.GetAsync($"{serverUrl}/biometric/templates");
                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync();
                        var templates = JsonConvert.DeserializeObject<List<dynamic>>(json);

                        // Reset matching DB
                        zkfp2.DBFree(dbHandle);
                        dbHandle = zkfp2.DBInit();
                        fingerprintMap.Clear();

                        int count = 0;
                        int idCounter = 1;

                        foreach (var item in templates)
                        {
                            string memberId = item.memberId;
                            int fingerIndex = item.fingerIndex;
                            string base64Template = item.templateData;

                            // Use SDK helper instead of Convert.FromBase64String to preserve ZK headers
                            byte[] dbTemplate = zkfp2.Base64ToBlob(base64Template);
                            if (dbTemplate == null || dbTemplate.Length == 0) continue;

                            int fid = idCounter++;

                            int addRes = zkfp2.DBAdd(dbHandle, fid, dbTemplate);
                            if (addRes == zkfperrdef.ZKFP_ERR_OK)
                            {
                                fingerprintMap[fid] = new FingerprintInfo { MemberId = memberId, FingerIndex = fingerIndex };
                                count++;
                            }
                        }

                        Console.WriteLine($"[+] Sincronización exitosa. {count} huellas cargadas en la base de datos local en memoria.");
                    }
                    else
                    {
                        Console.WriteLine($"[-] Error al sincronizar huellas: Código {response.StatusCode}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[-] Error de red durante la sincronización: {ex.Message}");
            }
        }

        private static void ProcessClientMessage(IWebSocketConnection socket, string rawMessage)
        {
            try
            {
                Console.WriteLine($"[*] WS Mensaje Recibido: {rawMessage}");
                var payload = JsonConvert.DeserializeObject<dynamic>(rawMessage);
                if (payload == null) return;
                string action = payload.action ?? "";

                if (action == "enroll")
                {
                    isEnrollMode = true;
                    enrollMemberId = payload.memberId;
                    enrollFingerIndex = payload.fingerIndex;
                    enrollStep = 1;
                    enrollTemplates = new byte[3][];
                    for (int i = 0; i < 3; i++)
                    {
                        enrollTemplates[i] = new byte[2048];
                    }
                    Console.WriteLine($"[*] Iniciando enrolamiento biométrico. Miembro: {enrollMemberId}, Dedo: {enrollFingerIndex}");
                    socket.Send(JsonConvert.SerializeObject(new { status = "scanning", count = 1 }));
                }
                else if (action == "cancel_enroll")
                {
                    ResetEnrollment();
                    socket.Send(JsonConvert.SerializeObject(new { status = "cancelled" }));
                }
                else if (action == "sync")
                {
                    Console.WriteLine("[*] Solicitud de sincronización recibida desde el cliente.");
                    Task.Run(async () => await SyncTemplates());
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[-] Error parseando mensaje del cliente: {ex.Message}");
            }
        }

        private static void PollSensorLoop()
        {
            byte[] capTmp = new byte[2048];

            while (isRunning)
            {
                int cbCapTmp = 2048;
                int ret = zkfp2.AcquireFingerprint(devHandle, fpBuffer, capTmp, ref cbCapTmp);

                if (ret == zkfperrdef.ZKFP_ERR_OK)
                {
                    if (isEnrollMode)
                    {
                        ProcessEnrollCapture(capTmp, cbCapTmp);
                    }
                    else if (verifyCaptureArmed)
                    {
                        verifyCaptureArmed = false;
                        ProcessVerifyCapture(capTmp, cbCapTmp);
                    }
                }
                else if (!isEnrollMode)
                {
                    // Rearm only after the scanner reports that the finger was removed.
                    verifyCaptureArmed = true;
                }

                Thread.Sleep(150);
            }
        }

        private static void ProcessEnrollCapture(byte[] template, int size)
        {
            // Copy bytes directly into the pre-allocated 2048-byte array
            Array.Copy(template, enrollTemplates[enrollStep - 1], size);

            Console.WriteLine($"[+] Escaneo {enrollStep} de 3 completado.");

            if (enrollStep < 3)
            {
                enrollStep++;
                BroadcastMessage(JsonConvert.SerializeObject(new { status = "scanning", count = enrollStep }));
            }
            else
            {
                // We have all 3 templates. Merge them
                byte[] mergedTemplate = new byte[2048];
                int mergedSize = mergedTemplate.Length;
                int mergeResult = zkfp2.DBMerge(dbHandle, enrollTemplates[0], enrollTemplates[1], enrollTemplates[2], mergedTemplate, ref mergedSize);

                if (mergeResult == zkfperrdef.ZKFP_ERR_OK)
                {
                    // Use SDK helper instead of Convert.ToBase64String to preserve ZK headers
                    string base64Template = zkfp2.BlobToBase64(mergedTemplate, mergedSize);
                    Console.WriteLine("[+] Enrolamiento biométrico completado con éxito.");
                    BroadcastMessage(JsonConvert.SerializeObject(new
                    {
                        status = "success",
                        template = base64Template,
                        fingerIndex = enrollFingerIndex
                    }));
                }
                else
                {
                    Console.WriteLine($"[-] Error al fundir (merge) las huellas dactilares. Código: {mergeResult}");
                    BroadcastMessage(JsonConvert.SerializeObject(new
                    {
                        status = "error",
                        message = "Las lecturas no coinciden de forma consistente. Vuelva a intentar."
                    }));
                }

                ResetEnrollment();
            }
        }

        private static void ProcessVerifyCapture(byte[] template, int size)
        {
            int fid = 0;
            int score = 0;
            int res = zkfp2.DBIdentify(dbHandle, template, ref fid, ref score);

            if (res == zkfperrdef.ZKFP_ERR_OK)
            {
                Console.WriteLine($"[+] Identificación biométrica exitosa. ID de huella: {fid}");
                if (fingerprintMap.TryGetValue(fid, out var info))
                {
                    Console.WriteLine($"[+] Socio identificado: {info.MemberId} (Dedo {info.FingerIndex})");
                    BroadcastMessage(JsonConvert.SerializeObject(new
                    {
                        @event = "scan_match",
                        scanId = Guid.NewGuid().ToString(),
                        memberId = info.MemberId,
                        fingerIndex = info.FingerIndex,
                        score = score
                    }));
                }
            }
            else
            {
                Console.WriteLine("[-] Huella capturada no coincide con ningún registro local.");
                BroadcastMessage(JsonConvert.SerializeObject(new { @event = "scan_unknown", scanId = Guid.NewGuid().ToString() }));
            }
        }

        private static void ResetEnrollment()
        {
            isEnrollMode = false;
            enrollFingerIndex = -1;
            enrollMemberId = "";
            enrollStep = 0;
            enrollTemplates = new byte[3][];
        }

        private static void BroadcastMessage(string message)
        {
            foreach (var socket in activeSockets)
            {
                if (socket.IsAvailable)
                {
                    socket.Send(message);
                }
            }
        }
    }
}
