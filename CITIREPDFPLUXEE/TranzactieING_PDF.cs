using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CITIREPDFPLUXEE
{
    public class TranzactieING_PDF
    {
        public DateTime? DataTranzactie { get; set; }
        public string TipTranzactie { get; set; } = string.Empty;
        public decimal? Suma { get; set; }
        public bool EsteCredit { get; set; } = false;
        public decimal? SoldFinal { get; set; }
        public DateTime? DataDecontarii { get; set; }
        public string NumarCard { get; set; } = string.Empty;
        public string Merchant { get; set; } = string.Empty;
        public string SursaCard { get; set; } = "Pluxee";
        public string Categorie { get; set; } = string.Empty;
        public string Detalii { get; set; } = string.Empty;
        public int? ParentId { get; set; }
    }
}

