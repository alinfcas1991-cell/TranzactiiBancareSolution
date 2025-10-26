namespace TranzactiiCommon.Models
{
    public class PnlModel
    {
        public short Luna { get; set; }
        public short An { get; set; }
        public string? Sursa { get; set; }
        public decimal Venituri { get; set; }
        public decimal Cheltuieli { get; set; }
        public decimal Profit { get; set; }
    }
}
