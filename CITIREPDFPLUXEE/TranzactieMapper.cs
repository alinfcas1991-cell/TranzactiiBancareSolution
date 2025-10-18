using System.Collections.Generic;
using System.Linq;

// 🟩 Clarificăm namespace-ul
using CITIREPDFPLUXEE.Models;
using CommonTranzactie = TranzactiiCommon.Models.TranzactieING;

namespace CITIREPDFPLUXEE
{
    public static class TranzactieMapper
    {
        // ✅ Conversie din TranzactieING_PDF -> Common.TranzactieING
        public static CommonTranzactie ToMainModel(TranzactieING_PDF src)
        {
            return new CommonTranzactie
            {
                DataTranzactie = src.DataTranzactie,
                TipTranzactie = src.TipTranzactie,
                Suma = src.Suma ?? 0,
                EsteCredit = src.EsteCredit,
                SoldFinal = src.SoldFinal,
                DataDecontarii = src.DataDecontarii,
                NumarCard = src.NumarCard,
                Merchant = src.Merchant,
                SursaCard = src.SursaCard,
                Categorie = src.Categorie,
                Detalii = src.Detalii,
                ParentId = src.ParentId
            };
        }

        // ✅ Suport pentru liste
        public static List<CommonTranzactie> ToMainModelList(IEnumerable<TranzactieING_PDF> src)
        {
            return src.Select(ToMainModel).ToList();
        }
    }
}
