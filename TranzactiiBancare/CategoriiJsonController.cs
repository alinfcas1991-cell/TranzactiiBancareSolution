using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace TranzactiiBancare
{
    [ApiController]
    [Route("api/categorii-json")]
    public class CategoriiJsonController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        public CategoriiJsonController(IWebHostEnvironment env)
        {
            _env = env;
        }

        // 🔍 Funcție internă care caută fișierul automat
        private string GetJsonPath()
        {
            var pathRender = Path.Combine(_env.ContentRootPath, "DataFiles", "categorii.json");
            var pathLocal = Path.Combine(_env.ContentRootPath, "wwwroot", "data", "categorii.json");

            if (System.IO.File.Exists(pathRender))
                return pathRender;
            if (System.IO.File.Exists(pathLocal))
                return pathLocal;

            Console.WriteLine("⚠️ Nu s-a găsit fișierul categorii.json!");
            return pathLocal; // default
        }

        [HttpGet]
        public IActionResult GetCategorii()
        {
            try
            {
                var jsonPath = GetJsonPath();

                if (!System.IO.File.Exists(jsonPath))
                    return Ok(new List<string>());

                var json = System.IO.File.ReadAllText(jsonPath);
                var categorii = JsonSerializer.Deserialize<List<string>>(json);

                Console.WriteLine($"✅ {categorii?.Count ?? 0} categorii încărcate din {jsonPath}");
                return Ok(categorii ?? new List<string>());
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Eroare la citirea JSON: {ex.Message}");
                return StatusCode(500, "Eroare la citirea fișierului categorii.json");
            }
        }

        public class CategorieDto
        {
            [JsonPropertyName("categorieNoua")]
            public string CategorieNoua { get; set; } = string.Empty;
        }

        [HttpPost]
        public IActionResult AddCategorie([FromBody] CategorieDto dto)
        {
            var jsonPath = GetJsonPath();

            if (dto == null || string.IsNullOrWhiteSpace(dto.CategorieNoua))
                return BadRequest("Categorie invalidă");

            var cat = dto.CategorieNoua.Trim().ToUpper();

            List<string> categorii;
            if (System.IO.File.Exists(jsonPath))
            {
                var json = System.IO.File.ReadAllText(jsonPath);
                categorii = JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
            }
            else
            {
                categorii = new List<string>();
            }

            if (!categorii.Contains(cat))
            {
                categorii.Add(cat);
                var updatedJson = JsonSerializer.Serialize(categorii, new JsonSerializerOptions { WriteIndented = true });
                System.IO.File.WriteAllText(jsonPath, updatedJson);
                Console.WriteLine($"✅ Categorie adăugată: {cat}");
            }

            return Ok(categorii);
        }
    }
}
