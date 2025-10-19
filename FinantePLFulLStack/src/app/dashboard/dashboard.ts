	import { Component, OnInit } from '@angular/core';
	import { CommonModule } from '@angular/common';
	import { RouterLink, RouterOutlet } from '@angular/router';
	import { HttpClientModule, HttpClient } from '@angular/common/http';
	import { MatCardModule } from '@angular/material/card';
	import { environment } from '../../environments/environment';
	

	interface Tranzactie {
	  id: number;
	  suma: number | null;
	  esteCredit: boolean;
	  soldFinal: number | null;
	  merchant?: string;
	  SursaCard?:string;
	}


	interface DashboardCard {
	  title: string;
	  amount: string;
	  img: string;
	}

	@Component({
	  selector: 'app-dashboard',
	  standalone: true,
	  imports: [
		CommonModule,
		HttpClientModule,
		RouterOutlet,
		RouterLink,
		MatCardModule
	  ],
	  templateUrl: './dashboard.html',
	  styleUrls: ['./dashboard.css']
	})
	export class DashboardComponent implements OnInit {
	  totalVenituri: number = 0;
	  totalCheltuieli: number = 0;
	  soldFinal: number = 0;
	  economii: number = 0;

	  cards: DashboardCard[] = [
		{ title: '💳 ING',     amount: '12,345.67 RON', img: 'assets/img/ing.png' },
		{ title: '🍔 Pluxee',  amount: '1,250.00 RON',  img: 'assets/img/pluxee.png' },
		{ title: '💵 Cash',    amount: '3,500.00 RON',  img: 'assets/img/cash.png' }
	  ];

	  constructor(private http: HttpClient) {}

	  ngOnInit(): void {
  this.http.get<Tranzactie[]>(`${environment.apiUrl}/api/tranzactii`)
    .subscribe({
      next: (data) => {
        // 🟩 toate veniturile (credit)
        this.totalVenituri = data
          .filter(t => t.esteCredit)
          .reduce((sum, t) => sum + (t.suma ?? 0), 0);

        // 🟥 toate cheltuielile (debit)
        const totalDebit = data
          .filter(t => !t.esteCredit)
          .reduce((sum, t) => sum + (t.suma ?? 0), 0);

        // 🟦 toate refund/intrări
        const totalRefund = data
          .filter(t => t.esteCredit && this.isRefundOrIncasare(t))
          .reduce((sum, t) => sum + (t.suma ?? 0), 0);

        // 🟨 cheltuieli reale
        this.totalCheltuieli = totalDebit - totalRefund;

        // 🟦 sold final (ultima tranzacție)
        this.soldFinal = data.length > 0 ? (data[data.length - 1].soldFinal ?? 0) : 0;

        // 🟪 economii = venituri - cheltuieli
        this.economii = this.totalVenituri - this.totalCheltuieli;

        // 💳 actualizăm cardurile dinamice (pe sursă)
        const totalING = this.calculeazaTotal(data, "ING");
        const totalPluxee = this.calculeazaTotal(data, "PLUXEE");
        const totalCash = this.calculeazaTotal(data, "CASH");

        this.cards = [
          { title: '💳 ING', amount: `${totalING.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`, img: 'assets/img/ing.png' },
          { title: '🍔 Pluxee', amount: `${totalPluxee.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`, img: 'assets/img/pluxee.png' },
          { title: '💵 Cash', amount: `${totalCash.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`, img: 'assets/img/cash.png' }
        ];

        console.log("💰 Total debit:", totalDebit);
        console.log("↩️ Total refund/intrări:", totalRefund);
        console.log("🟨 Cheltuieli reale:", this.totalCheltuieli);
        console.log("💳 ING:", totalING, "🍔 Pluxee:", totalPluxee, "💵 Cash:", totalCash);
      },
      error: (err) => console.error('❌ Eroare la API:', err)
    });
}


	  
private isRefundOrIncasare(t: Tranzactie): boolean {
  const merchant = t.merchant?.toUpperCase() ?? '';
  return (
    merchant.includes('RESTITUIRE') ||
    merchant.includes('INAPOI') ||
    merchant.includes('COLEG') ||
    merchant.includes('GEORGE ROBERT') ||
    merchant.includes('NICOLESCU ANA') ||
    merchant.includes('EMAG.RO') // 🔥 Adăugat acum
  );
}

private calculeazaTotal(data: Tranzactie[], sursa: string): number {
  return data
    .filter(t => (t.SursaCard?.toUpperCase() ?? '') === sursa.toUpperCase())
    .reduce((sum, t) => sum + (t.soldFinal ?? 0), 0);
}




	}
