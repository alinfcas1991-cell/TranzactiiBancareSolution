import { Component, ViewChild, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http'; // doar HttpClient, fără Module
import { FormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { BaseChartDirective } from 'ng2-charts';
import { MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { DialogDetaliiComponent } from '../reports/dialog-detalii.component'; // adaptăm calea

import { ChartData, ChartOptions, Chart, registerables } from 'chart.js';
Chart.register(...registerables);
import { environment } from '../../environments/environment';


@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    MatRadioModule,
    MatButtonModule,
	MatTableModule,        // 🟢 adăugat pentru mat-table
    BaseChartDirective,
	
  ],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css']
})
export class ReportsComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  private http = inject(HttpClient);   // 🟢 înlocuiește constructorul
  private dialog = inject(MatDialog);

  raportCategorii: any[] = [];
  perioadaSelectata = '7';
  perioade = [
    { val: '1', label: '1 zi' },
    { val: '2', label: '2 zile' },
    { val: '3', label: '3 zile' },
    { val: '7', label: '1 săptămână' },
    { val: '14', label: '2 săptămâni' },
    { val: '30', label: '1 lună' },
    { val: 'custom', label: 'Personalizat' }
  ];

  pieChartData: ChartData<'pie'> = {
    labels: [],
    datasets: [{ data: [], backgroundColor: [], borderWidth: 2 }]
  };

  pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#fff' } },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#ffeb3b',
        bodyColor: '#fff',
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.raw} lei`
        }
      }
    }
  };

  culori = ['#42a5f5','#66bb6a','#ffa726','#ab47bc','#ef5350','#26c6da','#5c6bc0','#ffd54f','#8d6e63'];

  ngOnInit() { this.incarcaRaport(); }

  incarcaRaport() {
    const zile = this.perioadaSelectata;

    this.http.get<any[]>(`${environment.apiUrl}/api/tranzactii/raport?days=${zile}`)
      .subscribe((data: any[]) => {
        // backend-ul tău ar trebui să trimită și detalii tranzacții per categorie
        this.raportCategorii = data.filter(x => !/VENIT|SALARIU/i.test(x.categorie));
        this.actualizeazaGrafic();
      });
  }
  
  // 🔹 Click pe categorie → deschide dialog
  deschideDetalii(categorie: string) {
  const zile = this.perioadaSelectata;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - Number(zile));

  const start = startDate.toISOString();
  const end = endDate.toISOString();

  this.http.get<any[]>(`${environment.apiUrl}/api/tranzactii/categorie/filtru/${encodeURIComponent(categorie)}?start=${start}&end=${end}`)
    .subscribe((tranzactii) => {
      this.dialog.open(DialogDetaliiComponent, {
        width: '700px',
        data: { categorie, tranzactii },
        panelClass: 'dialog-transparent'
      });
    });
}



  actualizeazaGrafic() {
    this.pieChartData.labels = this.raportCategorii.map(r => r.categorie);
    this.pieChartData.datasets[0].data = this.raportCategorii.map(r => r.total);
    this.pieChartData.datasets[0].backgroundColor = this.culori;
    this.chart?.update();
  }

  highlightCategory(categorie: string) {
    const index = this.pieChartData.labels?.indexOf(categorie);
    if (index !== undefined && index >= 0) {
      this.chart?.chart?.setActiveElements([{ datasetIndex: 0, index }]);
      this.chart?.update();
    }
  }

  calculeazaTotal() {
    return this.raportCategorii.reduce((s, r) => s + (r.total || 0), 0);
  }
  
  selecteazaPerioada() {
  console.log('📅 Perioada selectată:', this.perioadaSelectata);
  this.incarcaRaport(); // 🔥 auto-refresh
}

}
