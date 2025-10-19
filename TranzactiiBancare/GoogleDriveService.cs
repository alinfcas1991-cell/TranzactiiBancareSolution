using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using Newtonsoft.Json;
using System;
using System.IO;
using System.Threading;

namespace TranzactiiBancare
{
    public class GoogleDriveService
    {
        private static readonly string[] Scopes = { DriveService.Scope.DriveReadonly };
        private static readonly string ApplicationName = "FinantePLSync";
        private readonly DriveService _service;

        public GoogleDriveService()
        {
            try
            {
                Console.WriteLine("🚀 Initializare Google Drive Service (Render Ready)...");

                // 🔹 1️⃣ Citim variabilele din Environment
                var clientSecretJson = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET_JSON");
                var tokenJson = Environment.GetEnvironmentVariable("GOOGLE_TOKEN_JSON");

                if (string.IsNullOrEmpty(clientSecretJson) || string.IsNullOrEmpty(tokenJson))
                    throw new Exception("❌ Environment vars missing: GOOGLE_CLIENT_SECRET_JSON or GOOGLE_TOKEN_JSON");

                // 🔹 2️⃣ Parsăm obiectele JSON
                var clientSecrets = GoogleClientSecrets.FromStream(
                    new MemoryStream(System.Text.Encoding.UTF8.GetBytes(clientSecretJson))
                ).Secrets;

                var token = JsonConvert.DeserializeObject<Google.Apis.Auth.OAuth2.Responses.TokenResponse>(tokenJson);

                // 🔹 3️⃣ Creăm credentialele direct în memorie
                var credential = new UserCredential(
                    new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
                    {
                        ClientSecrets = clientSecrets,
                        Scopes = Scopes
                    }),
                    "user",
                    token
                );

                // 🔹 4️⃣ Inițializăm serviciul Drive
                _service = new DriveService(new BaseClientService.Initializer
                {
                    HttpClientInitializer = credential,
                    ApplicationName = ApplicationName,
                });

                Console.WriteLine("✅ Conectare Google Drive reușită!");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Eroare la inițializarea Google Drive Service: {ex.Message}");
                throw;
            }
        }

        // 🔹 Listăm fișierele din folderul indicat
        public void ListLatestFiles(string folderId)
        {
            try
            {
                Console.WriteLine("📂 Citire fișiere din Google Drive...");
                var request = _service.Files.List();
                request.Q = $"'{folderId}' in parents and trashed=false";
                request.Fields = "files(id, name, mimeType, createdTime)";
                request.OrderBy = "createdTime desc";

                var result = request.Execute();

                Console.WriteLine("✅ Fișiere găsite:");
                foreach (var file in result.Files)
                {
                    Console.WriteLine($"- {file.Name} ({file.Id}) {file.CreatedTime}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Eroare la listarea fișierelor: {ex.Message}");
            }
        }


        // 🔹 Descarcă ultimul fișier CSV din folderul Google Drive
        public string DownloadLatestFile(string folderId, string extension)
        {
            try
            {
                var request = _service.Files.List();
                request.Q = $"'{folderId}' in parents and trashed=false and name contains '{extension}'";
                request.Fields = "files(id, name, mimeType, createdTime)";
                request.OrderBy = "createdTime desc";
                request.PageSize = 1;

                var result = request.Execute();
                var file = result.Files.FirstOrDefault();

                if (file == null)
                {
                    Console.WriteLine($"⚠️ Nu s-au găsit fișiere {extension} în folderul Google Drive.");
                    return null;
                }

                Console.WriteLine($"⬇️ Descarc: {file.Name} ({file.Id})...");

                var downloadRequest = _service.Files.Get(file.Id);
                using var stream = new MemoryStream();
                downloadRequest.Download(stream);

                string tmpPath = Path.Combine("/tmp", file.Name);
                File.WriteAllBytes(tmpPath, stream.ToArray());

                Console.WriteLine($"✅ Fișier salvat în {tmpPath}");
                return tmpPath;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Eroare la descărcarea fișierului {extension}: {ex.Message}");
                return null;
            }
        }

        public string DownloadLatestCsv(string folderId) => DownloadLatestFile(folderId, ".csv");
        public string DownloadLatestPdf(string folderId) => DownloadLatestFile(folderId, ".pdf");


    }
}
