// Angular core
import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
	
// Material
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormControl } from '@angular/forms';
import { Observable, startWith, map,of } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ChangeDetectorRef } from '@angular/core';

// Charts (ng2-charts v8)
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { Chart, registerables } from 'chart.js';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../environments/environment';


Chart.register(...registerables); // asigură că toate tipurile sunt înregistrate
Chart.defaults.color = '#fff'; // 🔹 text alb peste tot
Chart.defaults.font.family = 'Poppins, Segoe UI, sans-serif';
Chart.defaults.font.size = 14;
Chart.defaults.font.weight = 600;


export interface Tranzactie {
  id: number;
  dataTranzactie: string | null;
  tipTranzactie: string | null;
  suma: number | null;
  esteCredit: boolean;
  esteProcesata: boolean; // ✅ adăugat nou
    // noul camp de mai devreme
  sursaCard: string | null;
  soldFinal: number | null;
  dataDecontarii: string | null;
  numarCard: string | null;
  merchant: string | null;
  dataAutorizarii: string | null;
  numarAutorizare: string | null;
  referinta: string | null;
  categorie: string | null;
  detalii: string | null;
 parentId?: number | null;
   nrBeri?: number | null;
  nrTigari?: number | null;
 


  // 🔹 UI-only (optionale)
  editing?: boolean;
  selected?: boolean;
  isSplitChild?: boolean;
  isNewChild?: boolean;
  highlightDelete?: boolean;   // 🔥 adaugă această linie
}



// =============================
// COMPONENT DIALOG
// =============================
@Component({
  selector: 'app-categorie-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
	ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatButtonModule,
	MatProgressBarModule,
	

  ],
  template: `
  <h2>✏️ Editează categoria</h2>
  <mat-form-field appearance="outline" class="big-field">
    <input
      matInput
      [formControl]="categorieControl"
      placeholder="Categorie"
      [matAutocomplete]="auto" />

    <mat-autocomplete #auto="matAutocomplete">
      <mat-option *ngFor="let cat of categoriiFiltrate | async" [value]="cat">
        {{ cat }}
      </mat-option>

      <mat-option
        *ngIf="categorieControl.value 
               && !categorii.includes(categorieControl.value.trim().toUpperCase())"
        [value]="categorieControl.value">
        ➕ Adaugă nouă: <strong>{{ categorieControl.value }}</strong>
      </mat-option>
    </mat-autocomplete>
  </mat-form-field>

  <div class="actions">
    <button mat-raised-button color="primary" (click)="confirm()">✅ Salvează</button>
    <button mat-raised-button color="warn" (click)="close()">❌ Anulează</button>
  </div>
`,
  styles: [`
    .big-field { width: 100%; font-size: 22px; }
    h2 { text-align: center; }
    .actions { margin-top: 20px; display: flex; justify-content: space-around; }
  `]
})
export class CategorieDialogComponent implements OnInit {
  categorieControl = new FormControl('');
  categoriiFiltrate!: Observable<string[]>;

  categorii: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<CategorieDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { categorie: string | null, categorii: string[] }
  ) {
    this.categorii = data.categorii;
  }

  ngOnInit(): void {
    this.categorieControl.setValue(this.data.categorie ?? '');

    this.categoriiFiltrate = this.categorieControl.valueChanges.pipe(
      startWith(this.data.categorie ?? ''),
      map(val => this.filtreazaCategorii(val || ''))
    );
  }

  confirm() {
    const val = this.categorieControl.value?.trim().toUpperCase();
    this.dialogRef.close(val);
  }

  close() {
    this.dialogRef.close(null);
  }

  private filtreazaCategorii(input: string): string[] {
    const val = input.toLowerCase();
    return this.categorii.filter(cat => cat.toLowerCase().includes(val));
  }
}





@Component({
  selector: 'app-ocr-preview-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    MatButtonModule
  ],
  template: `
  <h2>📄 Rezumat bon OCR</h2>

  <table mat-table [dataSource]="data.grupuri" class="mat-elevation-z8 full-width">
    <ng-container matColumnDef="categorie">
      <th mat-header-cell *matHeaderCellDef>Categorie</th>
      <td mat-cell *matCellDef="let item">
        <div class="cat-header" (click)="toggle(item)">
          <span>{{ item.categorie }}</span>
          <span class="cat-total">{{ item.total | number:'1.2-2' }} lei</span>
          <button mat-icon-button>
            {{ item.expanded ? '▾' : '▸' }}
          </button>
        </div>

        <div class="cat-details" *ngIf="item.expanded">
          <ul>
            <li *ngFor="let p of item.produse">{{ p }}</li>
          </ul>
        </div>
      </td>
    </ng-container>

    <tr mat-header-row *matHeaderRowDef="['categorie']"></tr>
    <tr mat-row *matRowDef="let row; columns: ['categorie'];"></tr>
  </table>

  <div class="totals">
  <div [ngClass]="{ ok: isMatch(), bad: !isMatch() }">
    🔥 Total OCR: {{ data.totalOcr | number:'1.2-2' }} lei  
    <br>
    🏦 Total BD (părinte): {{ data.totalParent | number:'1.2-2' }} lei  
    <br>
    ⚖️ Diferență: {{ diferentaAbsoluta | number:'1.2-2' }} lei
  </div>
</div>



  <div class="actions">
    <button mat-raised-button color="primary" (click)="confirm()">✅ Confirmă salvarea</button>
    <button mat-raised-button color="warn" (click)="close()">❌ Renunță</button>
  </div>
`,
  styles: [`
  h2 { text-align: center; margin-bottom: 15px; font-size: 22px; }
  table { width: 100%; border-collapse: collapse; font-size: 15px; }
  th, td { text-align: left; padding: 10px; }
  .cat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #1e1e2f;
    color: #fff;
    border-radius: 8px;
    padding: 10px 15px;
    margin-bottom: 6px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .cat-header:hover { background: #2d2d4d; }
  .cat-details {
    background: #fafafa;
    border-left: 4px solid #2196F3;
    padding: 8px 16px;
    margin: 6px 0 12px 0;
    border-radius: 6px;
    animation: slideIn 0.25s ease-out;
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .cat-details ul { margin: 0; padding-left: 20px; }
  .cat-details li { font-size: 14px; margin: 2px 0; color: #333; }
  .totals {
    margin: 20px 0;
    text-align: center;
    font-size: 17px;
    font-weight: bold;
  }
  .ok { color: #4CAF50; }
  .bad { color: #F44336; }
  .actions {
    display: flex;
    justify-content: space-around;
    margin-top: 20px;
  }
`]
})
export class OcrPreviewDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<OcrPreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  toggle(item: any) {
    item.expanded = !item.expanded;
  }

  isMatch(): boolean {
  const totalOcr = Math.abs(this.data.totalOcr ?? 0);
  const totalParent = Math.abs(this.data.totalParent ?? 0);
  return Math.abs(totalOcr - totalParent) < 0.05;
}

get diferentaAbsoluta(): number {
  const totalOcr = Math.abs(this.data.totalOcr ?? 0);
  const totalParent = Math.abs(this.data.totalParent ?? 0);
  return +(totalOcr - totalParent).toFixed(2);
}



  confirm() { this.dialogRef.close(true); }
  close() { this.dialogRef.close(false); }
}


// =============================
// COMPONENT PRINCIPAL
// =============================

type SursaCard = 'ING' | 'PLUXEE' | 'CASH';

@Component({
  selector: 'app-tranzactii',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatTableModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,   // 🟢 butoanele Material
    MatInputModule,
    MatAutocompleteModule,
    MatDialogModule,
    MatOptionModule,
	BaseChartDirective,
	MatProgressBarModule,
		MatTooltipModule,
		ReactiveFormsModule,
		MatRadioModule,     // ✅ pentru <mat-radio-button>
  MatIconModule,      // ✅ pentru <mat-icon>
  MatButtonModule     // ✅ pentru butonul cu icon
		//NgChartsModule

  ],
  templateUrl: './tranzactii.html',
  styleUrls: ['./tranzactii.css']
})



export class TranzactiiComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = [
  'select','id','locked','dataTranzactie','tipTranzactie','suma',
  'esteCredit','sursaCard','soldFinal','numarCard','merchant',
  'referinta','categorie','nrBeri','nrTigari','actions'
  
];



balanteStart: Record<SursaCard, number> = {
  ING: 5612.57,
  PLUXEE: 12.7,
  CASH: 400
};



  tipuriTranzactie: string[] = [
    'Cumparare POS',
    'Incasare',
    'Incasare via card',
    'Ramburs colegi'
  ];

autoSplitEnabled: boolean = true; // activat implicit
editingCell: { id: number, field: string } | null = null;
editValue: any = null;


surseCard: string[] = ['ING','Pluxee','Cash']; // 🔹 valori dropdown
totaleSurse: any[] = [];
totalBeri = 0;
totalPretBeri = 0;
totalTigari = 0;
totalPretTigari = 0;
sursaFiltru: string = 'TOATE';
// 🔹 Variabilă pentru filtrul vizual din Import & surse
filtruSursaVizual: string = 'TOATE';

	  categorieControl = new FormControl('');
  categoriiFiltrate: Observable<string[]> = of([]);
  dataSource: Tranzactie[] = [];
  hoverMode = false;
  filter: string | null = null;
  categorieNoua: string = '';
  categorii: string[] = [];
  sursaSelectata: string = 'ING'; // default
  totalHover = 0;
  isLoadingOcr = false;
  uploadProgress = 0;

  lastRowIndex: number | null = null;
  scrolling = false;
  scrollTimeout: any;
	showPie: boolean = false;
  sumEntireColumn = false;
  columnTotal = 0;
	chartMode: 'pie' | 'bar' = 'pie';

  bulkCategorie: string | null = null;

  // Pie chart data/options
  pieChartData: ChartData<'pie'> = {
    labels: [],
    datasets: [{
      data: [],
      // culori (opțional): poți șterge array-ul dacă vrei default
      backgroundColor: [
        '#FF6384','#36A2EB','#FFCE56','#8BC34A','#FF9800',
        '#9C27B0','#00BCD4','#E91E63','#4CAF50','#795548',
        '#607D8B','#673AB7','#FFC107','#009688','#FF5722',
        '#3F51B5','#CDDC39','#F44336','#2196F3','#9E9E9E'
      ]
    }]
  };

pieChartOptions: ChartOptions<'pie' | 'bar'> = {
  responsive: true,
  maintainAspectRatio: false, // 🔹 permite extinderea graficului
  layout: {
    padding: 10
  },
  plugins: {
    legend: {
      position: 'right',
      labels: {
        color: '#fff', // ✅ asta e importantă chiar dacă ai generateLabels
        font: {
          size: 15,
          family: 'Poppins, Segoe UI, sans-serif',
          weight: 600
        },
        padding: 12,
        boxWidth: 20,
        usePointStyle: true,
        generateLabels: (chart: any) => {
          const data = chart.data;
          if (!data.labels || !data.datasets.length) return [];
          const dataset = data.datasets[0].data as number[];
          const total = dataset.reduce((a: number, b: number) => a + b, 0);

          return data.labels.map((label: string, i: number) => {
            const value = dataset[i];
            const percentage = ((value / total) * 100).toFixed(1);
            return {
              text: `${label} (${percentage}%)`,
              fillStyle: (chart.data.datasets[0].backgroundColor as any)[i],
              hidden: false,
              index: i,
              fontColor: '#fff',   // 🔹 forțăm alb pe legendă
              strokeStyle: '#fff', // 🔹 contur alb la marker
            };
          });
        }
      } as any
    }
  }
};






  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private dialog: MatDialog,
	public cdr: ChangeDetectorRef,
	private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
  window.addEventListener('scroll', this.scrollHandler);
  this.filter = this.route.snapshot.data['filter'] ?? null;

  // Încarcă categoriile și inițializează filtrarea auto-complete
  this.http.get<string[]>(`${environment.apiUrl}/api/categorii-json`)
  .subscribe({
    next: (categoriiJson) => {
      console.log("✅ Răspuns API categorii-json primit:", categoriiJson);
      console.log("🌍 Endpoint apelat:", `${environment.apiUrl}/api/categorii-json`);
      console.log("📦 Tipul răspunsului:", Array.isArray(categoriiJson) ? `Array (${categoriiJson.length})` : typeof categoriiJson);

      this.categorii = categoriiJson || [];

      if (this.categorii.length === 0) {
        console.warn("⚠️ Lista de categorii e goală — verifică fișierul JSON pe backend.");
      }

      // initializează controlul autocomplete
      this.categorieControl.setValue('');

      this.categoriiFiltrate = this.categorieControl.valueChanges.pipe(
        startWith(''),
        debounceTime(200),
        distinctUntilChanged(),
        map(val => this.filtreazaCategorii(val || ''))
      );
    },
    error: (err) => {
      console.error("❌ Eroare la încărcare categorii JSON:", err);
      console.error("🌍 URL încercat:", `${environment.apiUrl}/api/categorii-json`);
    }
  });

  // Încarcă tranzacțiile
  this.http.get<Tranzactie[]>(`${environment.apiUrl}/api/tranzactii`).subscribe({
    next: (data) => {
      console.log("♻️ ngOnInit(): încărcare date tranzacții");

      this.dataSource = data.map(t => {
        const det = (t.detalii || "").toLowerCase();
        const isOcrChild =
          det.includes('bon ocr') ||
          det.includes('🧾') ||
          det.includes('ocr:') ||
          det.startsWith('🧾') ||
          det.includes('→');
		  
		const rowClass = t.tipTranzactie?.toLowerCase().includes('incasare')
    ? 'incasare-row'
    : '';
	
        return {
          ...t,
		  rowClass,
          editing: false,
          selected: false,
          isSplitChild: isOcrChild,
          isNewChild: false
        };
      });

      this.columnTotal = this.calculateColumnTotal();
      this.updatePieChart();
	  this.loadTotalePeSurse(); 
	  this.calculeazaTotaluri();

      console.log("📊 total copii OCR:", this.dataSource.filter(x => x.isSplitChild).length);
    },
    error: (err) => console.error('❌ Eroare la API:', err)
  });
}

ngAfterViewInit(): void {
  setTimeout(() => this.syncHeaderWidth(), 500);
  window.addEventListener('resize', () => this.syncHeaderWidth());
}

private syncHeaderWidth() {
  try {
    const matHeader = document.querySelector('table.mat-mdc-table thead tr');
    const tableHeaderDivs = document.querySelectorAll('.header-row div');

    if (!matHeader || tableHeaderDivs.length === 0) return;

    const ths = Array.from(matHeader.querySelectorAll('th'))
      .filter(th => (th as HTMLElement).offsetParent !== null); // ✅ doar cele vizibile

    // Dacă numărul diferă, loghează dar continuă parțial
    if (ths.length !== tableHeaderDivs.length) {
      console.warn(`⚠️ Diferență coloane: ${ths.length} <th> vizibile vs ${tableHeaderDivs.length} header div-uri.`);
    }

    const count = Math.min(ths.length, tableHeaderDivs.length);
    for (let i = 0; i < count; i++) {
      const width = (ths[i] as HTMLElement).offsetWidth + 'px';
      (tableHeaderDivs[i] as HTMLElement).style.width = width;
    }

    console.log('✅ Header sincronizat corect.');
  } catch (e) {
    console.warn('❌ Eroare la syncHeaderWidth:', e);
  }
}





  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.scrollHandler);
  }

  private scrollHandler = () => {
    this.scrolling = true;
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => (this.scrolling = false), 200);
  };

  // =========================
  //   PIE CHART
  // =========================
  updatePieChart() {
  const grouped: { [key: string]: number } = {};

  this.dataSource.forEach(t => {
    // 🔸 ignoră toate tranzacțiile Credit
    if (t.esteCredit) return;

    const cat = t.categorie ?? 'Necunoscut';
    grouped[cat] = (grouped[cat] || 0) + (t.suma ?? 0);
  });

  this.pieChartData = {
    labels: Object.keys(grouped),
    datasets: [
      {
        data: Object.values(grouped),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#8BC34A', '#FF9800',
          '#9C27B0', '#00BCD4', '#E91E63', '#4CAF50', '#795548',
          '#607D8B', '#673AB7', '#FFC107', '#009688', '#FF5722',
          '#3F51B5', '#CDDC39', '#F44336', '#2196F3', '#9E9E9E'
        ]
      }
    ]
  };
}



  // =========================
  //   HOVER TOTAL
  // =========================
  onHover(rowIndex: number, suma: number | null, tipTranzactie: string | null) {
    if (suma == null || this.scrolling || this.sumEntireColumn) return;
    const valoare = this.asSignedAmount(suma, tipTranzactie);

    if (this.lastRowIndex == null) {
      this.totalHover = valoare;
    } else if (rowIndex > this.lastRowIndex) {
      this.totalHover += valoare;
    } else if (rowIndex < this.lastRowIndex) {
      this.totalHover -= valoare;
    }
    this.lastRowIndex = rowIndex;
  }

  resetTotal() {
    if (this.sumEntireColumn) return;
    this.totalHover = 0;
    this.lastRowIndex = null;
  }

  toggleColumnSum() {
    this.sumEntireColumn = !this.sumEntireColumn;
    if (this.sumEntireColumn) {
      this.columnTotal = this.calculateColumnTotal();
      this.totalHover = 0;
      this.lastRowIndex = null;
    }
  }

  getBannerTotal(): number {
    return this.sumEntireColumn ? this.columnTotal : this.totalHover;
  }

  private calculateColumnTotal(): number {
    return this.dataSource.reduce((acc, t) => {
      if (t.suma == null) return acc;
      return acc + this.asSignedAmount(t.suma, t.tipTranzactie);
    }, 0);
  }

  private asSignedAmount(suma: number, tipTranzactie: string | null): number {
    const label = (tipTranzactie ?? '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return label.includes('incasare') ? -suma : suma;
  }

  // =========================
  //   UPDATE INDIVIDUAL
  // =========================
  save(element: Tranzactie) {
    const dto = { categorie: element.categorie };
    this.http.put<Tranzactie>(`${environment.apiUrl}/api/tranzactii/${element.id}`, dto)
      .subscribe({
        next: (resp) => {
          element.editing = false;
          this.updatePieChart(); // recalculează placinta
          if (this.sumEntireColumn) this.columnTotal = this.calculateColumnTotal();
          console.log('✅ Categorie salvata:', resp);
        },
        error: (err) => console.error('❌ Eroare la update categorie:', err)
      });
  }

  cancel(element: Tranzactie) {
    element.editing = false;
    console.log('❌ Editare anulata pentru:', element);
  }

  // =========================
  //   EDIT CATEGORIE (dialog)
  // =========================
  editCategorie(element: Tranzactie) {
  const dialogRef = this.dialog.open(CategorieDialogComponent, {
    width: '400px',
    data: {
      categorie: element.categorie ?? '',
      categorii: this.categorii
    }
  });

  dialogRef.afterClosed().subscribe((result: string | null) => {
    if (!result) return; // ⛔ dacă utilizatorul a închis fără valoare

    const val = result.trim().toUpperCase();
    console.log('🔹 Valoare primită din dialog:', val);

    if (!val) return; // ⛔ protecție extra

    // ✅ dacă e categorie nouă, o trimitem la API
    if (!this.categorii.includes(val)) {
      this.http.post<string[]>(
        `${environment.apiUrl}/api/categorii-json`,
        { categorieNoua: val },
        { headers: { 'Content-Type': 'application/json' } }
      ).subscribe({
        next: (updatedList) => {
          this.categorii = updatedList;
          console.log('✅ Categorie nouă adăugată:', val);
        },
        error: (err) => console.error('❌ Eroare POST categorie:', err)
      });
    }

    // ✅ actualizează tranzacția local
    element.categorie = val;
    this.save(element);
  });
}




  // =========================
  //   BULK UPDATE
  // =========================
  applyBulkUpdate() {
    if (!this.bulkCategorie) {
      alert('Selectează o categorie!');
      return;
    }
    const selectate = this.dataSource.filter(t => t.selected);
    if (selectate.length === 0) {
      alert('Bifează cel puțin o linie!');
      return;
    }

    const ids = selectate.map(t => t.id);
    this.http.put(`${environment.apiUrl}/api/tranzactii/bulk-categorie`, {
      categorie: this.bulkCategorie,
      ids
    }).subscribe({
      next: () => {
        selectate.forEach(t => t.categorie = this.bulkCategorie!);
        this.updatePieChart();
        if (this.sumEntireColumn) this.columnTotal = this.calculateColumnTotal();
        console.log('✅ Bulk update reușit!');
      },
      error: (err) => console.error('❌ Eroare la bulk update:', err)
    });
  }
  
  // BULK DELETE//
  
  bulkDelete() {
  const selectate = this.dataSource.filter(t => t.selected);
  if (selectate.length === 0) {
    alert('Bifează cel puțin o linie pentru ștergere!');
    return;
  }

  if (!confirm(`Sigur vrei să ștergi ${selectate.length} tranzacții selectate?`))
    return;

  const ids = selectate.map(t => t.id);

  this.http.post(`${environment.apiUrl}/api/tranzactii/bulk-delete`, ids).subscribe({
    next: (resp: any) => {
      console.log(`✅ ${resp.deleted} tranzacții șterse.`);
      this.dataSource = this.dataSource.filter(t => !ids.includes(t.id));
      this.updatePieChart();
    },
    error: (err) => {
      console.error('❌ Eroare la ștergere bulk:', err);
      alert('Eroare la ștergerea tranzacțiilor selectate.');
    }
  });
}


  // =========================
  //   SPLIT TRANZACTIE
  // =========================
  addSplitRow(parent: Tranzactie) {
    const newRow: Tranzactie = {
  ...parent,
  id: 0,
  suma: 0,
  categorie: null,
  editing: true,
  selected: false,
  isSplitChild: true
};

    const index = this.dataSource.findIndex(t => t.id === parent.id);
    const newData = [...this.dataSource];
    newData.splice(index + 1, 0, newRow);
    this.dataSource = newData;
  }

  confirmSplit(parent: Tranzactie) {
    const index = this.dataSource.findIndex(t => t.id === parent.id);
    const children: Tranzactie[] = [];
    for (let i = index + 1; i < this.dataSource.length; i++) {
      if (this.dataSource[i].isSplitChild) children.push(this.dataSource[i]);

      else break;
    }
    if (children.length === 0) {
      alert('Nu există rânduri split de confirmat.');
      return;
    }

    const dto = {
      parentId: parent.id,
      splits: children.map(c => ({
        suma: c.suma,
        categorie: c.categorie
      }))
    };

    this.http.post<{ newIds: number[] }>(`${environment.apiUrl}/api/tranzactii/split`, dto)
      .subscribe({
        next: (resp) => {
          // eliminăm parent + copii din UI
          this.dataSource = this.dataSource.filter(t => t.id !== parent.id && !children.includes(t));

          // adăugăm copii confirmați cu ID-urile reale din DB
          const copiiConfirmati = children.map((c, i) => ({
            ...c,
            id: resp.newIds[i],
            isSplitChild: false,
            editing: false
          }));

          const newData = [...this.dataSource];
          newData.splice(index, 0, ...copiiConfirmati);
          this.dataSource = newData;

          this.updatePieChart();
          console.log('✅ Split reușit, noi ID-uri:', resp.newIds);
        },
        error: (err) => {
          console.error('❌ Eroare la split:', err);
          alert('Eroare la salvarea split-ului în baza de date');
        }
      });
  }

 removeSplitRow(row: Tranzactie) {
  // dacă e doar un copil local nesalvat
  if (!row.id || row.id === 0) {
    row.highlightDelete = true;

    setTimeout(() => {
      this.dataSource = this.dataSource.filter(t => t !== row);
      this.updatePieChart();
    }, 300);

    return;
  }

  // dacă e rând salvat în baza de date
  if (confirm(`Sigur vrei să ștergi tranzacția #${row.id}?`)) {
    row.highlightDelete = true;

    setTimeout(() => {
      this.http.delete(`${environment.apiUrl}/api/tranzactii/${row.id}`).subscribe({
        next: () => {
          this.dataSource = this.dataSource.filter(t => t.id !== row.id);
          this.updatePieChart();
          console.log(`✅ Tranzacția ${row.id} ștearsă din DB`);
        },
        error: (err) => {
          console.error('❌ Eroare la ștergere:', err);
          alert('Eroare la ștergerea tranzacției din baza de date.');
        }
      });
    }, 300);
  }
}


  
  // OCR BONURI///
  openFileDialog(tranzactie: Tranzactie) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (event: any) => this.onFileSelected(event, tranzactie.id);
  input.click();
}

async onFileSelected(event: Event, parentId: number) {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;

  const file = input.files[0];
  const formData = new FormData();
  formData.append('file', file);
  formData.append('parentId', parentId.toString());

  // 🌀 Pornim spinner + resetăm progresul
  this.isLoadingOcr = true;
  this.uploadProgress = 0;

  try {
    // 🔹 Cerere HTTP cu progres vizibil
    const req = this.http.post(`${environment.apiUrl}/api/tranzactii/attach-ocr`, formData, {
      reportProgress: true,
      observe: 'events'
    });

    const response: any = await new Promise((resolve, reject) => {
      req.subscribe({
        next: (event: any) => {
          if (event.type === 1 && event.total) {
            // 📈 Progres upload
            this.uploadProgress = Math.round((event.loaded / event.total) * 100);
          } else if (event.type === 4) {
            // ✅ Răspuns final primit
            resolve(event.body);
          }
        },
        error: (err) => reject(err)
      });
    });

    const res = response;

    // 🔸 Dacă backend-ul a returnat o eroare
    if (!res.success) {
      this.isLoadingOcr = false;
      const confirmView = confirm(`${res.message}\n\nVrei să vezi JSON-ul OCR?`);
      if (confirmView && res.jsonPreview) {
        const formatted = JSON.stringify(res.jsonPreview, null, 2);
        this.showJsonDialog(formatted);
      }
      return;
    }

    // 🔹 Oprim spinnerul — gata uploadul
    this.isLoadingOcr = false;

    // 🔹 Deschidem direct fereastra OCR, fără alert intermediar
    // 🔹 Deschidem direct fereastra OCR, fără alert intermediar
if (res.grupuri && res.grupuri.length > 0) {
  const dialogRef = this.dialog.open(OcrPreviewDialogComponent, {
    width: '900px',
    maxHeight: '90vh',
    data: {
      parentId,
      grupuri: res.grupuri,
      totalOcr: res.totalOcr ?? res.grupuri.reduce((a: number, b: any) => a + (b.total || 0), 0),
      totalParent: res.totalParent ?? 0
    }
  });

  dialogRef.afterClosed().subscribe((confirmed: boolean) => {
    if (confirmed) {
      // ✅ Aici construim DTO-ul complet cu produse
      const dto = {
        parentId: parentId,
        grupuri: res.grupuri.map((g: any) => ({
          categorie: g.categorie,
          total: g.total,
          produse: g.produse || []   // 👈 adăugăm lista produselor
        }))
      };

      // ✅ Trimitem tot către backend (inclusiv produsele OCR)
      this.http.post(`${environment.apiUrl}/api/tranzactii/confirm-ocr`, dto).subscribe({
        next: (resp: any) => {
          alert(resp.message || "✅ OCR confirmat și salvat în baza de date!");
          this.reloadTranzactii();
		   this.loadTotalePeSurse();
		   this.calculeazaTotaluri();
		  setTimeout(() => this.verificaDiferentaParinteCopii(parentId), 1000);
        },
        error: (err) => {
          console.error("❌ Eroare la confirm-ocr:", err);
          alert("Eroare la confirmarea OCR în baza de date!");
        }
      });
    }
  });
}


  } catch (error) {
    console.error("❌ Eroare OCR:", error);
    alert("A apărut o eroare la trimiterea imaginii OCR!");
  } finally {
    // 🔹 Reset UI
    this.isLoadingOcr = false;
    this.uploadProgress = 0;
    input.value = '';
  }
}




reloadTranzactii() {
  console.log("♻️ reloadTranzactii() a fost apelată"); // <-- test log

  this.http.get<Tranzactie[]>(`${environment.apiUrl}/api/tranzactii`).subscribe({
    next: (data) => {
      this.dataSource = [];

      setTimeout(() => {
        this.dataSource = data.map(t => {
          const det = (t.detalii || "").toLowerCase();

          const isOcrChild =
            det.includes('bon ocr') ||
            det.includes('🧾') ||
            det.includes('ocr:');

          if (isOcrChild) {
            console.log(`👶 Copil OCR detectat: ID=${t.id}, cat=${t.categorie}, detalii=${t.detalii}`);
          } else {
            console.log(`👨 Parinte normal: ID=${t.id}, cat=${t.categorie}, detalii=${t.detalii}`);
          }

          return {
            ...t,
            editing: false,
            selected: false,
            isSplitChild: isOcrChild,
            isNewChild: false
          };
        });

        console.log('📊 Total copii OCR detectați:', this.dataSource.filter(x => x.isSplitChild).length);
      }, 0);
    },
    error: (err) => console.error('❌ Eroare reload:', err)
  });
}



showJsonDialog(jsonText: string) {
  const dlg = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
  if (dlg) {
    dlg.document.write(`<pre style="white-space:pre-wrap;font-family:monospace;font-size:13px">${jsonText}</pre>`);
  }
}
hasSelection(): boolean {
  try {
    return Array.isArray(this.dataSource) && this.dataSource.some(t => !!t?.selected);
  } catch {
    return false;
  }
}

openOcrPreviewDialog(parentId: number, grupuri: any[], totalOcr: number, totalParent: number) {
  const dlg = this.dialog.open(OcrPreviewDialogComponent, {
    width: '700px',
    data: { parentId, grupuri, totalOcr, totalParent }
  });

  dlg.afterClosed().subscribe((confirmat: boolean) => {
    if (confirmat) {
      this.http.post(`${environment.apiUrl}/api/tranzactii/confirm-ocr`, {
        parentId,
        grupuri: grupuri.map(g => ({ categorie: g.categorie, total: g.total }))
      }).subscribe({
        next: () => {
          alert('✅ Bon OCR importat cu succes!');
          this.reloadTranzactii();
		   this.loadTotalePeSurse();
        },
        error: err => alert('❌ Eroare la confirmare OCR: ' + err.message)
      });
    }
  });
}

esteMagazinOCR(merchant: string): boolean {
  if (!merchant) return false;
  const text = merchant.toLowerCase();
  return text.includes('lidl') || text.includes('penny') || text.includes('kaufland');
}

formatDetaliiTooltip(element: Tranzactie): string {
  if (!element.detalii) return 'Bon OCR fără detalii disponibile.';
  try {
    const produse = JSON.parse(element.detalii);
    if (Array.isArray(produse)) {
      return produse
        .map((p: any) => `• ${p.nume ?? p} – ${p.suma?.toFixed?.(2) ?? ''} lei`)
        .join('\n');
    }
  } catch {
    // fallback dacă detalii nu e JSON valid
  }
  return element.detalii;
}

verificaDiferentaParinteCopii(parinteId: number, nivel: number = 0) {
  const parinte = this.dataSource.find(t => t.id === parinteId);
  if (!parinte) return;

  const copii = this.dataSource.filter(t => t.parentId === parinteId);
  const sumaCopii = copii.reduce((acc, c) => acc + (c.suma || 0), 0);

  // ✅ folosim valoarea absolută la calcul
  const diferenta = +(Math.abs(parinte.suma ?? 0) - Math.abs(sumaCopii)).toFixed(2);

  console.log(`🔎 Reconciliere nivel ${nivel}:`, {
    parinteId,
    sumaParinte: parinte.suma,
    sumaCopii,
    diferenta
  });

  // 🟩 1️⃣ Marjă de eroare ±0.05 lei
  if (Math.abs(diferenta) <= 0.05) {
    if (confirm(`✅ Sumele coincid (Δ ${diferenta} lei). Dorești să ștergem linia părinte?`)) {
      this.stergeParinte(parinteId);
    }
    return;
  }

  // 🟨 2️⃣ Diferență semnificativă
  const raspuns = confirm(`⚠️ Diferență ${diferenta} lei între părinte și copii.\nVrei să adaugi o linie pentru ambalaje/garanții?`);
  if (!raspuns) return;

  const linieNoua: Tranzactie = {
    ...parinte,
    id: 0,
    isSplitChild: true,
    parentId: parinteId,
    categorie: "ALTE (ambalaje/garanții)",
    suma: diferenta, // deja pozitiv
    detalii: `Diferență automată (Δ +${diferenta} lei)`
  };

  this.dataSource.push(linieNoua);
  console.log(`➕ Adăugată linie diferență de ${diferenta} lei.`);
}




stergeParinte(id: number) {
  // Șterge din frontend
  this.dataSource = this.dataSource.filter(t => t.id !== id);

  // 🔥 Opțional: șterge și din DB
  this.http.delete(`${environment.apiUrl}/api/tranzactii/${id}`).subscribe({
    next: () => console.log(`🗑️ Parinte ${id} șters din DB`),
    error: (err) => console.error('Eroare la ștergere parinte:', err)
  });
}

adaugaTranzactieNoua() {
  const tranzactieNoua: Tranzactie = {
    id: 0,
    dataTranzactie: new Date().toISOString().substring(0, 10), // azi, format ISO (pt input[type=date])
    tipTranzactie: '',
    suma: 0,
    esteCredit: false,
	esteProcesata: false, // ✅ adăugat corect aici
    sursaCard: 'ING',
    soldFinal: null,
    dataDecontarii: null,
    numarCard: null,
    merchant: '',
    dataAutorizarii: null,
    numarAutorizare: '',
    referinta: '',
    categorie: '',
    detalii: '',
    editing: true,
    isNewChild: false,
    selected: false
  };

  this.dataSource = [tranzactieNoua, ...this.dataSource]; // inserare în top
}

confirmTranzactieNoua(tranzactie: Tranzactie) {
  this.http.post<Tranzactie>(`${environment.apiUrl}/api/tranzactii`, tranzactie).subscribe({
    next: (resp) => {
      tranzactie.id = resp.id;
      tranzactie.editing = false;
      this.updatePieChart();
      console.log('✅ Tranzacție nouă salvată:', resp);
    },
    error: (err) => {
      console.error('❌ Eroare la salvare tranzacție nouă:', err);
      alert('Eroare la salvare!');
    }
  });
}

anuleazaTranzactieNoua(tranzactie: Tranzactie) {
  this.dataSource = this.dataSource.filter(t => t !== tranzactie);
}


actualizeazaSoldFinal(tranzactie: any) {
  const suma = tranzactie.suma ?? 0;
  const esteCredit = tranzactie.esteCredit === true;

  // ⚠️ Găsește indexul liniei noi în listă
  const indexNou = this.dataSource.findIndex(t => t.id === 0);

  // 🔍 Găsește prima tranzacție de sub linia nouă care are sold valid
  let soldAnterior = 0;
  for (let i = indexNou + 1; i < this.dataSource.length; i++) {
    const t = this.dataSource[i];
    if (t.soldFinal != null && !isNaN(t.soldFinal)) {
      soldAnterior = t.soldFinal;
      break;
    }
  }

  // 🧮 Calculează soldul nou
  tranzactie.soldFinal = esteCredit
    ? soldAnterior + suma
    : soldAnterior - suma;
}



salveazaBeri(tranzactie: Tranzactie) {
  const dto = { nrBeri: tranzactie.nrBeri };
  this.http.put(`${environment.apiUrl}/api/tranzactii/update-nrberi/${tranzactie.id}`, dto)
    .subscribe({
      next: () => console.log(`🍺 Nr beri salvat: ${tranzactie.nrBeri}`),
      error: (err) => console.error('❌ Eroare la salvare NrBeri:', err)
	  
    });
	this.calculeazaTotaluri(); // 👈 actualizează sumarul
}

salveazaTigari(tranzactie: Tranzactie) {
  const dto = { nrTigari: tranzactie.nrTigari };
  this.http.put(`${environment.apiUrl}/api/tranzactii/update-nrtigari/${tranzactie.id}`, dto)
    .subscribe({
      next: () => console.log(`🚬 Nr țigări salvat: ${tranzactie.nrTigari}`),
      error: (err) => console.error('❌ Eroare la salvare NrTigari:', err)
    });
	this.calculeazaTotaluri(); // 👈 actualizează sumarul
}



private incarcaCategoriiDinJson() {
  this.http.get<string[]>(`${environment.apiUrl}/api/categorii-json`).subscribe({
    next: (cat) => this.categorii = cat,
    error: (err) => console.error('❌ Eroare la GET categorii JSON:', err)
  });
}

adaugaCategorie() {
  const nouaCategorie = this.categorieControl.value?.trim().toUpperCase();
  if (!nouaCategorie || this.categorii.includes(nouaCategorie)) return;

  this.http.post<string[]>(
    `${environment.apiUrl}/api/categorii-json`,
     { categorieNoua: nouaCategorie },
  { headers: { 'Content-Type': 'application/json' } }
  ).subscribe({
    next: (res) => {
      this.categorii = res;
      this.categorieControl.setValue('');
      console.log('✅ Categorie adăugată:', nouaCategorie);
    },
    error: (err) => console.error('❌ Eroare la adăugare categorie:', err)
  });
}



private filtreazaCategorii(input: string): string[] {
  const val = input.toLowerCase();
  return this.categorii.filter(cat => cat.toLowerCase().includes(val));
}

importCsv() {
  console.log('📤 Sursă selectată:', this.sursaSelectata);
  if (!this.sursaSelectata) {
    alert('Selectează mai întâi sursa extrasului!');
    return;
  }

  if (!confirm(`Vrei să imporți ultimul fișier ${this.sursaSelectata === 'PLUXEE' ? 'PDF' : 'CSV'} (${this.sursaSelectata})?`))
    return;

  const payload = {
    sursa: this.sursaSelectata,
    autoSplit: this.autoSplitEnabled
  };

  this.http.post(`${environment.apiUrl}/api/tranzactii/import-csv`, payload).subscribe({
    next: (resp: any) => {
      if (resp.success) {
        alert(resp.message || `✅ Import ${this.sursaSelectata} finalizat cu succes!`);
        this.reloadTranzactii();
		 this.loadTotalePeSurse();
		 this.calculeazaTotaluri();
      } else {
        alert(`⚠️ ${resp.message}`);
      }
    },
    error: (err) => {
      console.error('❌ Eroare la import:', err);
      alert('Eroare la import!');
    }
  });
}



startEdit(element: any, field: string) {
  this.editingCell = { id: element.id, field };
  this.editValue = element[field];
}

cancelEdit(element?: any) {
  // dacă s-a apelat cu un element concret, oprește editarea doar pe acela
  if (element) {
    element.editingField = null;
  }

  // global: resetăm contextul editării
  this.editingCell = null;
  this.editValue = null;
}


saveEdit(element: any, field: string) {
  if (!this.editValue || this.editValue === element[field]) {
    this.cancelEdit();
    return;
  }

  this.http.put(`${environment.apiUrl}/api/tranzactii/update-inline/${element.id}`, {
    [field]: this.editValue
  }).subscribe({
    next: (response: any) => {
      // ✅ actualizează imediat valoarea locală
      element[field] = this.editValue;

      // 🟢 Forțăm Angular să detecteze obiect nou
      Object.assign(element, { justUpdated: true });
      this.dataSource = [...this.dataSource];

      this.cdr.detectChanges();

      // ✅ efect vizual dispare după 1 secundă
      setTimeout(() => {
        element.justUpdated = false;
        this.dataSource = [...this.dataSource];
        this.cancelEdit();
      }, 1000);
    },
    error: err => {
      console.error('❌ Eroare la update:', err);
      this.cancelEdit();
    }
  });
}

loadTotalePeSurse() {
  this.http.get<any[]>(`${environment.apiUrl}/api/tranzactii/totale-sursa`)

    .subscribe({
      next: (data) => this.totaleSurse = data,
      error: (err) => console.error('❌ Eroare la totale-sursa:', err)
    });
}

getTotalProfit(): number {
  if (!this.totaleSurse || this.totaleSurse.length === 0) return 0;

  return this.totaleSurse.reduce((total, t) => {
    const venit = t.totalVenituri || 0;
    const cheltuieli = t.totalCheltuieli || 0;
    return total + (venit - cheltuieli);
  }, 0);
}
calculeazaTotaluri() {
  const tranzactii = this.dataSource || [];

  // 🍺 Total bere: adunăm toate nrBeri + suma lor
  const doarBeri = tranzactii.filter(t => t.nrBeri && t.nrBeri > 0);
  this.totalBeri = doarBeri.reduce((sum, t) => sum + (t.nrBeri || 0), 0);
  this.totalPretBeri = doarBeri.reduce((sum, t) => sum + (t.suma || 0), 0);

  // 🚬 Total țigări: adunăm toate nrTigari + suma lor
  const doarTigari = tranzactii.filter(t => t.nrTigari && t.nrTigari > 0);
  this.totalTigari = doarTigari.reduce((sum, t) => sum + (t.nrTigari || 0), 0);
  this.totalPretTigari = doarTigari.reduce((sum, t) => sum + (t.suma || 0), 0);

  console.log(`🍺 ${this.totalBeri} beri (${this.totalPretBeri.toFixed(2)} lei), 🚬 ${this.totalTigari} pachete (${this.totalPretTigari.toFixed(2)} lei)`);
}

filtreazaTranzactii() {
  if (this.sursaFiltru === 'TOATE') {
    return this.dataSource;
  }
  return this.dataSource.filter(t => (t.sursaCard || '').toUpperCase() === this.sursaFiltru.toUpperCase());
}

getTranzactiiFiltrate(): Tranzactie[] {
  if (!this.dataSource) return [];
  if (this.filtruSursaVizual === 'TOATE') return this.dataSource;
  return this.dataSource.filter(t =>
    (t.sursaCard || '').toUpperCase() === this.filtruSursaVizual.toUpperCase()
  );
}

getBalanta(sursa: SursaCard): number {
  const tranz = this.dataSource ?? [];

  const venituri = tranz
    .filter(t => (t.sursaCard || '').toUpperCase() === sursa)
    .filter(t =>
      t.esteCredit === true ||
      (t.tipTranzactie || '').toLowerCase().includes('credit') ||
      (t.tipTranzactie || '').toLowerCase().includes('alimentare') ||
      (t.tipTranzactie || '').toLowerCase().includes('incasare')
    )
    .reduce((sum, t) => sum + (t.suma ?? 0), 0);

  const cheltuieli = tranz
    .filter(t => (t.sursaCard || '').toUpperCase() === sursa)
    .filter(t =>
      t.esteCredit === false ||
      (t.tipTranzactie || '').toLowerCase().includes('debit') ||
      (t.tipTranzactie || '').toLowerCase().includes('plata') ||
      (t.tipTranzactie || '').toLowerCase().includes('cheltuiala')
    )
    .reduce((sum, t) => sum + (t.suma ?? 0), 0);

  const start = this.balanteStart[sursa] ?? 0;

  // 🧠 Logica adaptivă în funcție de sursa cardului
  const estePluxee = (sursa || '').toUpperCase().includes('PLUXEE');

  // ING → scădem cheltuielile
  // PLUXEE → adunăm cheltuielile (sunt deja negative)
  const balanta = estePluxee
    ? start + venituri - cheltuieli
    : start + venituri - cheltuieli;

  console.log(`🔹 ${sursa} → Venituri: ${venituri}, Cheltuieli: ${cheltuieli}, Start: ${start}, Balanță: ${balanta}`);

  return balanta;
}




getTotalCheltuieli(sursa: string): number {
  const tranz = this.dataSource ?? [];
  return tranz
    .filter(t => (t.sursaCard || '').toUpperCase() === sursa.toUpperCase())
    .filter(t =>
      t.esteCredit === false ||
      (t.tipTranzactie || '').toLowerCase().includes('debit') ||
      (t.tipTranzactie || '').toLowerCase().includes('plata')
    )
    .reduce((sum, t) => sum + (t.suma ?? 0), 0);
}


getTotalVenituri(sursa: string): number {
  const tranz = this.dataSource ?? [];
  return tranz
    .filter(t => (t.sursaCard || '').toUpperCase() === sursa.toUpperCase())
    .filter(t =>
      t.esteCredit === true ||
      (t.tipTranzactie || '').toLowerCase().includes('credit') ||
      (t.tipTranzactie || '').toLowerCase().includes('alimentare') ||
      (t.tipTranzactie || '').toLowerCase().includes('incasare')
    )
    .reduce((sum, t) => sum + (t.suma ?? 0), 0);
}




}
