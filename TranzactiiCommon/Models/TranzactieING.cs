namespace TranzactiiCommon.Models
{
    public class TranzactieING
    {
        public int Id { get; set; }
        public DateTime? DataTranzactie { get; set; }
        public string? TipTranzactie { get; set; }
        public decimal? Suma { get; set; }
        public bool EsteCredit { get; set; }
        public decimal? SoldFinal { get; set; }
        public DateTime? DataDecontarii { get; set; }
        public string? NumarCard { get; set; }
        public string? Merchant { get; set; }
        public DateTime? DataAutorizarii { get; set; }
        public string? NumarAutorizare { get; set; }
        public string? Referinta { get; set; }
        public string? Categorie { get; set; }
        public string? Detalii { get; set; }

        public string? SursaCard { get; set; }  // ING | Pluxee | Cash
        public int? ParentId { get; set; }

        public int? NrBeri { get; set; }
        public int? NrTigari { get; set; }
        public bool EsteProcesata { get; set; } = false;

        // 🔹 Noile câmpuri pentru P&L
        public decimal? NetPersonal { get; set; }
        public bool EstePersonal { get; set; } = false;
    }
}
