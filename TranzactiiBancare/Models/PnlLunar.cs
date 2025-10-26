using System;
using System.ComponentModel.DataAnnotations;

namespace TranzactiiBancare.Models
{
    public class PnlLunar
    {
        [Key]
        public int Id { get; set; }
        public short Luna { get; set; }
        public short An { get; set; }
        public string? Sursa { get; set; }
        public decimal Venituri { get; set; }
        public decimal Cheltuieli { get; set; }
        public decimal Profit { get; set; }
        public DateTime DataSalvare { get; set; } = DateTime.Now;
    }
}
