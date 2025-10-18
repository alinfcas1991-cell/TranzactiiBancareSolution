using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace TranzactiiBancare
{
    [ApiController]
    [Route("api/categorii-json")]
    public class CategoriiJsonController : ControllerBase
    {
        private readonly string jsonPath;

        public CategoriiJsonController(IWebHostEnvironment env)
        {
            jsonPath = Path.Combine(env.WebRootPath, "data", "categorii.json");
        }

        [HttpGet]
        public IActionResult GetCategorii()
        {
            if (!System.IO.File.Exists(jsonPath))
                return Ok(new List<string>());

            var json = System.IO.File.ReadAllText(jsonPath);
            var categorii = JsonSerializer.Deserialize<List<string>>(json);
            return Ok(categorii ?? new List<string>());
        }

    public class CategorieDto
        {
            [JsonPropertyName("categorieNoua")] // 👈 asigură maparea corectă între camelCase și PascalCase
            public string CategorieNoua { get; set; } = string.Empty;
    }



        [HttpPost]
        public IActionResult AddCategorie([FromBody] CategorieDto dto)
        {
            // Log pentru debugging
            Console.WriteLine("===== AddCategorie called =====");
            Console.WriteLine($"dto is null? {dto == null}");
            if (dto != null)
                Console.WriteLine($"dto.CategorieNoua = '{dto.CategorieNoua}'");

            if (dto == null || string.IsNullOrWhiteSpace(dto.CategorieNoua))
            {
                return BadRequest("Categorie invalidă");
            }

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
            }

            return Ok(categorii);
        }

    }

}
