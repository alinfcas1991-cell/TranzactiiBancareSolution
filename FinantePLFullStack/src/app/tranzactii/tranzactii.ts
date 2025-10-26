// Angular core
import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  Inject,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

// RxJS
import {
  Observable,
  of,
  startWith,
  map
} from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged
} from 'rxjs/operators';

// Angular Material
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import {
  MatDialogModule,
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatMomentDateModule } from '@angular/material-moment-adapter';

// Animations
import {
  trigger,
  transition,
  style,
  animate
} from '@angular/animations';

// Charts
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { Chart, registerables } from 'chart.js';

// ENV
import { environment } from '../../environments/environment';

// ============================
// CHART GLOBAL DEFAULTS
// ============================
Chart.register(...registerables);
Chart.defaults.color = '#fff';
Chart.defaults.font.family = 'Poppins, Segoe UI, sans-serif';
Chart.defaults.font.size = 14;
Chart.defaults.font.weight = 600;

// ============================
// INTERFEȚE
// ============================

export interface Tranzactie {
  id: number;
  dataTranzactie: string | null;
  tipTranzactie: string | null;
  suma: number | null;
  esteCredit: boolean;
  esteProcesata: boolean; // pentru marcaj procesare import

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

  netPersonal?: number | null;   // suma efectiv personală
  estePersonal?: boolean;        // marcat ca personal (true = aplica netPersonal)

  // UI only
  editing?: boolean;
  selected?: boolean;
  isSplitChild?: boolean;        // copil OCR / split
  isNewChild?: boolean;          // rând nou nesalvat
  highlightDelete?: boolean;     // pentru animație ștergere
  rowClass?: string;             // pentru styling condițional (incasare-row etc.)
}

// ============================
// DIALOG: Editare categorie
// ============================
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
    MatProgressBarModule
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
    @Inject(MAT_DIALOG_DATA)
    public data: { categorie: string | null, categorii: string[] }
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
    return this.categorii.filter(cat =>
      cat.toLowerCase().includes(val)
    );
  }
}

// ============================
// DIALOG: Ajustare netPersonal
// ============================
@Component({
  selector: 'app-netpersonal-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <h2>⚙️ Ajustează sumă personală</h2>

    <mat-form-field appearance="outline" style="width:100%;">
      <mat-label>Suma efectivă personală</mat-label>
      <input
        matInput
        type="number"
        [(ngModel)]="valoare"
        min="0"
        step="0.01" />
    </mat-form-field>

    <div class="hint">
      Suma originală:
      <b>{{ data.suma | number:'1.2-2' }} lei</b>
    </div>

    <div class="actions">
      <button mat-raised-button color="primary" (click)="confirm()">✅ Salvează</button>
      <button mat-raised-button color="warn" (click)="close()">❌ Anulează</button>
    </div>
  `,
  styles: [`
    h2 { text-align: center; margin-bottom: 15px; font-size: 20px; }
    .hint { text-align: center; color: #bbb; margin-bottom: 10px; }
    .actions { display: flex; justify-content: space-around; margin-top: 20px; }
  `]
})
export class NetPersonalDialogComponent {
  valoare: number;

  constructor(
    public dialogRef: MatDialogRef<NetPersonalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { suma: number, netPersonal: number | null }
  ) {
    this.valoare = data.netPersonal ?? data.suma;
  }

  confirm() {
    this.dialogRef.close(this.valoare);
  }

  close() {
    this.dialogRef.close(null);
  }
}


// ============================
// DIALOG: PREVIEW OCR
// ============================
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
        <br />
        🏦 Total BD (părinte): {{ data.totalParent | number:'1.2-2' }} lei
        <br />
        ⚖️ Diferență: {{ diferentaAbsoluta | number:'1.2-2' }} lei
      </div>
    </div>

    <div class="actions">
      <button mat-raised-button color="primary" (click)="confirm()">
        ✅ Confirmă salvarea
      </button>
      <button mat-raised-button color="warn" (click)="close()">
        ❌ Renunță
      </button>
    </div>
  `,
  styles: [`
    h2 {
      text-align: center;
      margin-bottom: 15px;
      font-size: 22px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 15px;
    }
    th, td {
      text-align: left;
      padding: 10px;
    }
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
      to   { opacity: 1; transform: translateY(0);   }
    }
    .cat-details ul {
      margin: 0;
      padding-left: 20px;
    }
    .cat-details li {
      font-size: 14px;
      margin: 2px 0;
      color: #333;
    }
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
  close()   { this.dialogRef.close(false); }
}

// ============================
// COMPONENTA PRINCIPALĂ
// ============================

type SursaCard = 'ING' | 'PLUXEE' | 'CASH';

@Component({
  selector: 'app-tranzactii',
  standalone: true,
  imports: [
    // Angular
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,

    // Material
    MatTableModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatInputModule,
    MatAutocompleteModule,
    MatDialogModule,
    MatOptionModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatRadioModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatMomentDateModule,

    // Charts
    BaseChartDirective
  ],
  templateUrl: './tranzactii.html',
  styleUrls: ['./tranzactii.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9) translateY(15px)' }),
        animate(
          '450ms cubic-bezier(0.25, 0.8, 0.25, 1)',
          style({ opacity: 1, transform: 'scale(1) translateY(0)' })
        )
      ]),
      transition(':leave', [
        animate(
          '350ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          style({ opacity: 0, transform: 'scale(0.95) translateY(-15px)' })
        )
      ])
    ])
  ]
})
export class TranzactiiComponent implements OnInit, AfterViewInit, OnDestroy {

  // =========================
  // 🔢 COL DEFINE
  // =========================
  displayedColumns: string[] = [
    'select', 'id', 'locked', 'dataTranzactie', 'tipTranzactie', 'suma',
    'esteCredit', 'sursaCard', 'soldFinal', 'numarCard', 'merchant',
    'referinta', 'categorie', 'nrBeri', 'nrTigari',
    'netPersonal', 'estePersonal', 'actions'
  ];

  // =========================
  // 💼 BALANȚĂ DE PORNIRE (sold inițial)
  // =========================
  balanteStart: Record<SursaCard, number> = {
    ING: 5612.57,
    PLUXEE: -12.7,
    CASH: 400
  };

  // =========================
  // 📋 STATE (form / view)
  // =========================
  tipuriTranzactie: string[] = [
    'Cumparare POS',
    'Incasare',
    'Incasare via card',
    'Ramburs colegi'
  ];

  autoSplitEnabled: boolean = true;

  // inline-edit state
  editingCell: { id: number; field: string } | null = null;
  editValue: any = null;

  // mark personal spend / netPersonal edit
  netPersonal?: number | null;
  estePersonal?: boolean;

  // dropdown surse import
  surseCard: string[] = ['ING', 'Pluxee', 'Cash'];

  // agregate pe surse (venituri/cheltuieli etc.)
  totaleSurse: any[] = [];

  // consum bere / tigari
  totalBeri = 0;
  totalPretBeri = 0;
  totalTigari = 0;
  totalPretTigari = 0;
  pnlIng = { venituri: 0, cheltuieli: 0, profit: 0 };
pnlPluxee = { venituri: 0, cheltuieli: 0, profit: 0 };
showDropdownLuni = false;

luni = [
  { nume: 'Ianuarie', index: 0 },
  { nume: 'Februarie', index: 1 },
  { nume: 'Martie', index: 2 },
  { nume: 'Aprilie', index: 3 },
  { nume: 'Mai', index: 4 },
  { nume: 'Iunie', index: 5 },
  { nume: 'Iulie', index: 6 },
  { nume: 'August', index: 7 },
  { nume: 'Septembrie', index: 8 },
  { nume: 'Octombrie', index: 9 },
  { nume: 'Noiembrie', index: 10 },
  { nume: 'Decembrie', index: 11 }
];

  // filtrare UI
  sursaFiltru: string = 'TOATE';
  filtruSursaVizual: string = 'TOATE';
  profitHeader = 0;
cheltuieliHeader = 0;


  // P&L lunar
  lunaSelectata: Date = new Date();

  // autocomplete categorii
  categorieControl = new FormControl('');
  categoriiFiltrate: Observable<string[]> = of([]);
  categorii: string[] = [];

  // dataset principal
  dataSource: Tranzactie[] = [];
  dataSourceFiltrat: Tranzactie[] = [];
	showChartEvolutie = false;
profitChartData: any;
profitChartOptions: any;
  // UI flags
  hoverMode = false;
  filter: string | null = null;
  categorieNoua: string = '';
  sursaSelectata: string = 'ING';
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
  showBalanceMode: boolean = true; // switch vizual balansă vs P&L

  // CHART DATA
  pieChartData: ChartData<'pie'> = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          '#FF6384','#36A2EB','#FFCE56','#8BC34A','#FF9800',
          '#9C27B0','#00BCD4','#E91E63','#4CAF50','#795548',
          '#607D8B','#673AB7','#FFC107','#009688','#FF5722',
          '#3F51B5','#CDDC39','#F44336','#2196F3','#9E9E9E'
        ]
      }
    ]
  };

  pieChartOptions: ChartOptions<'pie' | 'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 10 },
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#fff',
          font: {
            size: 15,
            family: 'Poppins, Segoe UI, sans-serif',
            weight: 600
          },
          padding: 12,
          boxWidth: 20,
          usePointStyle: true,
          // generare legendă custom cu procente
          generateLabels: (chart: any) => {
            const data = chart.data;
            if (!data.labels || !data.datasets.length) return [];
            const dataset = data.datasets[0].data as number[];
            const total = dataset.reduce(
              (a: number, b: number) => a + b,
              0
            );

            return data.labels.map((label: string, i: number) => {
              const value = dataset[i];
              const percentage = ((value / total) * 100).toFixed(1);
              return {
                text: `${label} (${percentage}%)`,
                fillStyle: (chart.data.datasets[0].backgroundColor as any)[i],
                hidden: false,
                index: i,
                fontColor: '#fff',
                strokeStyle: '#fff'
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

  // ===================================================
  // 1. 🔄 LIFECYCLE
  // ===================================================

  ngOnInit(): void {
    window.addEventListener('scroll', this.scrollHandler);
	// 🔹 Setăm luna curentă la inițializare
  this.lunaSelectata = new Date();
  
  // 🔹 Aducem imediat datele P&L pentru luna curentă (după un mic delay)
  setTimeout(() => {
    this.onLunaSchimbata({ value: this.lunaSelectata });
  }, 300);

    this.filter = this.route.snapshot.data['filter'] ?? null;

    // 1. încărcăm lista categorii disponibile (din JSON server)
    this.http.get<string[]>(`${environment.apiUrl}/api/categorii-json`)
      .subscribe({
        next: (categoriiJson) => {
          this.categorii = categoriiJson || [];

          // autocomplete setup
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
        }
      });

    // 2. încărcăm tranzacțiile
    this.http.get<Tranzactie[]>(`${environment.apiUrl}/api/tranzactii`)
      .subscribe({
        next: (data) => {
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

          // calc summary stuff
          this.columnTotal = this.calculateColumnTotal();
          this.updatePieChart();
          this.loadTotalePeSurse();
          this.calculeazaTotaluri();
        },
        error: (err) => console.error('❌ Eroare la API tranzacții:', err)
      });
  }

  ngAfterViewInit(): void {
	
	 setTimeout(() => {
    if (!this.showBalanceMode) {
      this.onLunaSchimbata({ value: this.lunaSelectata });
    }
  }, 500);
    setTimeout(() => this.syncHeaderWidth(), 500);
    window.addEventListener('resize', () => this.syncHeaderWidth());
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.scrollHandler);
  }

  // ===================================================
  // 2. 📂 DATA MANAGEMENT (reload, import, update DB)
  // ===================================================

  reloadTranzactii() {
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
          this.calculeazaTotaluri();
        }, 0);
      },
      error: (err) => console.error('❌ Eroare reload:', err)
    });
  }

  importCsv() {
    if (!this.sursaSelectata) {
      alert('Selectează mai întâi sursa extrasului!');
      return;
    }

    if (!confirm(
      `Vrei să imporți ultimul fișier ${this.sursaSelectata === 'PLUXEE' ? 'PDF' : 'CSV'} (${this.sursaSelectata})?`
    )) return;

    const payload = {
      sursa: this.sursaSelectata,
      autoSplit: this.autoSplitEnabled
    };

    this.http.post(`${environment.apiUrl}/api/Tranzactii/import-csv`, payload)
      .subscribe({
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

  // update pe surse agregate (venituri/cheltuieli)
  loadTotalePeSurse() {
    this.http.get<any[]>(`${environment.apiUrl}/api/tranzactii/totale-sursa`)
      .subscribe({
        next: (data) => this.totaleSurse = data,
        error: (err) => console.error('❌ Eroare la totale-sursa:', err)
      });
  }

  // confirm tranzacție nouă creată manual
  confirmTranzactieNoua(tranzactie: Tranzactie) {
    this.http.post<Tranzactie>(`${environment.apiUrl}/api/tranzactii`, tranzactie)
      .subscribe({
        next: (resp) => {
          tranzactie.id = resp.id;
          tranzactie.editing = false;
          this.updatePieChart();
        },
        error: (err) => {
          console.error('❌ Eroare la salvare tranzacție nouă:', err);
          alert('Eroare la salvare!');
        }
      });
  }

  // ===================================================
  // 3. 🧾 OCR / SPLIT LOGIC
  // ===================================================

  // adaugă copil split sub o tranzacție părinte
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

  // confirmă split către backend
  confirmSplit(parent: Tranzactie) {
    const index = this.dataSource.findIndex(t => t.id === parent.id);
    const children: Tranzactie[] = [];
    for (let i = index + 1; i < this.dataSource.length; i++) {
      if (this.dataSource[i].isSplitChild) {
        children.push(this.dataSource[i]);
      } else break;
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
          // eliminăm parent + copii vechi
          this.dataSource = this.dataSource.filter(
            t => t.id !== parent.id && !children.includes(t)
          );

          // adăugăm copii confirmați
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
        },
        error: (err) => {
          console.error('❌ Eroare la split:', err);
          alert('Eroare la salvarea split-ului în baza de date');
        }
      });
  }

  // ștergere rând split / copil OCR
  removeSplitRow(row: Tranzactie) {
    // rând local nesalvat încă
    if (!row.id || row.id === 0) {
      row.highlightDelete = true;
      setTimeout(() => {
        this.dataSource = this.dataSource.filter(t => t !== row);
        this.updatePieChart();
      }, 300);
      return;
    }

    // rând în DB
    if (confirm(`Sigur vrei să ștergi tranzacția #${row.id}?`)) {
      row.highlightDelete = true;

      setTimeout(() => {
        this.http.delete(`${environment.apiUrl}/api/tranzactii/${row.id}`)
          .subscribe({
            next: () => {
              this.dataSource = this.dataSource.filter(t => t.id !== row.id);
              this.updatePieChart();
            },
            error: (err) => {
              console.error('❌ Eroare la ștergere:', err);
              alert('Eroare la ștergerea tranzacției din baza de date.');
            }
          });
      }, 300);
    }
  }

  // upload imagine OCR și preview
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

    this.isLoadingOcr = true;
    this.uploadProgress = 0;

    try {
      const req = this.http.post(
        `${environment.apiUrl}/api/tranzactii/attach-ocr`,
        formData,
        {
          reportProgress: true,
          observe: 'events'
        }
      );

      const response: any = await new Promise((resolve, reject) => {
        req.subscribe({
          next: (event: any) => {
            if (event.type === 1 && event.total) {
              // upload progress
              this.uploadProgress = Math.round(
                (event.loaded / event.total) * 100
              );
            } else if (event.type === 4) {
              resolve(event.body);
            }
          },
          error: (err) => reject(err)
        });
      });

      const res = response;
      if (!res.success) {
        this.isLoadingOcr = false;
        const confirmView = confirm(
          `${res.message}\n\nVrei să vezi JSON-ul OCR?`
        );
        if (confirmView && res.jsonPreview) {
          const formatted = JSON.stringify(res.jsonPreview, null, 2);
          this.showJsonDialog(formatted);
        }
        return;
      }

      this.isLoadingOcr = false;

      if (res.grupuri && res.grupuri.length > 0) {
        const dialogRef = this.dialog.open(OcrPreviewDialogComponent, {
          width: '900px',
          maxHeight: '90vh',
          data: {
            parentId,
            grupuri: res.grupuri,
            totalOcr:
              res.totalOcr ??
              res.grupuri.reduce(
                (a: number, b: any) => a + (b.total || 0),
                0
              ),
            totalParent: res.totalParent ?? 0
          }
        });

        dialogRef.afterClosed()
          .subscribe((confirmed: boolean) => {
            if (confirmed) {
              const dto = {
                parentId: parentId,
                grupuri: res.grupuri.map((g: any) => ({
                  categorie: g.categorie,
                  total: g.total,
                  produse: g.produse || []
                }))
              };

              this.http.post(
                `${environment.apiUrl}/api/tranzactii/confirm-ocr`,
                dto
              ).subscribe({
                next: (resp: any) => {
                  alert(
                    resp.message ||
                    "✅ OCR confirmat și salvat în baza de date!"
                  );
                  this.reloadTranzactii();
                  this.loadTotalePeSurse();
                  this.calculeazaTotaluri();

                  setTimeout(
                    () => this.verificaDiferentaParinteCopii(parentId),
                    1000
                  );
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
      this.isLoadingOcr = false;
      this.uploadProgress = 0;
      input.value = '';
    }
  }

  verificaDiferentaParinteCopii(parinteId: number, nivel: number = 0) {
    const parinte = this.dataSource.find(t => t.id === parinteId);
    if (!parinte) return;

    const copii = this.dataSource.filter(t => t.parentId === parinteId);
    const sumaCopii = copii.reduce(
      (acc, c) => acc + (c.suma || 0),
      0
    );

    const diferenta = +(
      Math.abs(parinte.suma ?? 0) -
      Math.abs(sumaCopii)
    ).toFixed(2);

    if (Math.abs(diferenta) <= 0.05) {
      if (confirm(
        `✅ Sumele coincid (Δ ${diferenta} lei). Ștergem linia părinte?`
      )) {
        this.stergeParinte(parinteId);
      }
      return;
    }

    const raspuns = confirm(
      `⚠️ Diferență ${diferenta} lei între părinte și copii.\n` +
      `Vrei să adaugi o linie pentru ambalaje/garanții?`
    );
    if (!raspuns) return;

    const linieNoua: Tranzactie = {
      ...parinte,
      id: 0,
      isSplitChild: true,
      parentId: parinteId,
      categorie: "ALTE (ambalaje/garanții)",
      suma: diferenta,
      detalii: `Diferență automată (Δ +${diferenta} lei)`
    };

    this.dataSource.push(linieNoua);
  }

  stergeParinte(id: number) {
    this.dataSource = this.dataSource.filter(t => t.id !== id);
    this.http.delete(`${environment.apiUrl}/api/tranzactii/${id}`)
      .subscribe({
        next: () => {},
        error: (err) => console.error('Eroare la ștergere parinte:', err)
      });
  }

  // ===================================================
  // 4. ✍️ EDITARE INLINE / CATEGORII / BULK
  // ===================================================

  startEdit(element: any, field: string) {
    this.editingCell = { id: element.id, field };
    this.editValue = element[field];
  }

  cancelEdit(element?: any) {
    if (element) {
      element.editingField = null;
    }
    this.editingCell = null;
    this.editValue = null;
  }

  saveEdit(element: any, field: string) {
    if (!this.editValue || this.editValue === element[field]) {
      this.cancelEdit();
      return;
    }

    this.http.put(
      `${environment.apiUrl}/api/tranzactii/update-inline/${element.id}`,
      { [field]: this.editValue }
    ).subscribe({
      next: () => {
        element[field] = this.editValue;
        Object.assign(element, { justUpdated: true });
        this.dataSource = [...this.dataSource];
        this.cdr.detectChanges();

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

  // deschidere dialog categorie pt 1 tranzacție
  editCategorie(element: Tranzactie) {
    const dialogRef = this.dialog.open(CategorieDialogComponent, {
      width: '400px',
      data: {
        categorie: element.categorie ?? '',
        categorii: this.categorii
      }
    });

    dialogRef.afterClosed().subscribe((result: string | null) => {
      if (!result) return;

      const val = result.trim().toUpperCase();
      if (!val) return;

      // dacă e categorie nouă -> POST la backend ca să o adăugăm în lista globală
      if (!this.categorii.includes(val)) {
        this.http.post<string[]>(
          `${environment.apiUrl}/api/categorii-json`,
          { categorieNoua: val },
          { headers: { 'Content-Type': 'application/json' } }
        ).subscribe({
          next: (updatedList) => {
            this.categorii = updatedList;
          },
          error: (err) => console.error('❌ Eroare POST categorie:', err)
        });
      }

      // update tranzacție local + DB
      element.categorie = val;
      this.save(element);
    });
  }

  // confirm update categorie pt o tranzacție
  save(element: Tranzactie) {
    const dto = { categorie: element.categorie };
    this.http.put<Tranzactie>(
      `${environment.apiUrl}/api/tranzactii/${element.id}`,
      dto
    ).subscribe({
      next: () => {
        element.editing = false;
        this.updatePieChart();
        if (this.sumEntireColumn) {
          this.columnTotal = this.calculateColumnTotal();
        }
      },
      error: (err) => console.error('❌ Eroare la update categorie:', err)
    });
  }

  // bulk categorie pe multiple tranzacții selectate
  applyBulkUpdate() {
    if (!this.bulkCategorie) {
      alert('Selectează o categorie!');
      return;
    }
    const selectate = this.dataSource.filter(t => t.selected);
    if (!selectate.length) {
      alert('Bifează cel puțin o linie!');
      return;
    }

    const ids = selectate.map(t => t.id);
    this.http.put(
      `${environment.apiUrl}/api/tranzactii/bulk-categorie`,
      { categorie: this.bulkCategorie, ids }
    ).subscribe({
      next: () => {
        selectate.forEach(
          t => t.categorie = this.bulkCategorie!
        );
        this.updatePieChart();
        if (this.sumEntireColumn) {
          this.columnTotal = this.calculateColumnTotal();
        }
      },
      error: (err) => console.error('❌ Eroare la bulk update:', err)
    });
  }

  // bulk delete tranzacții
  bulkDelete() {
    const selectate = this.dataSource.filter(t => t.selected);
    if (!selectate.length) {
      alert('Bifează cel puțin o linie pentru ștergere!');
      return;
    }

    if (!confirm(
      `Sigur vrei să ștergi ${selectate.length} tranzacții selectate?`
    )) return;

    const ids = selectate.map(t => t.id);

    this.http.post(
      `${environment.apiUrl}/api/tranzactii/bulk-delete`,
      ids
    ).subscribe({
      next: (resp: any) => {
        this.dataSource = this.dataSource.filter(
          t => !ids.includes(t.id)
        );
        this.updatePieChart();
      },
      error: (err) => {
        console.error('❌ Eroare la ștergere bulk:', err);
        alert('Eroare la ștergerea tranzacțiilor selectate.');
      }
    });
  }

  // marcare sumă personală pe tranzacție
  openNetPersonalDialog(element: Tranzactie) {
    const dialogRef = this.dialog.open(NetPersonalDialogComponent, {
      width: '350px',
      data: {
        suma: element.suma ?? 0,
        netPersonal: element.netPersonal ?? null
      }
    });

    dialogRef.afterClosed().subscribe((valoare: number | null) => {
      if (valoare == null) return;

      element.netPersonal = valoare;
      element.estePersonal = true;

      this.http.put(
        `${environment.apiUrl}/api/tranzactii/update-netpersonal/${element.id}`,
        { netPersonal: valoare }
      ).subscribe({
        next: () => {},
        error: (err) => console.error('❌ Eroare la update NetPersonal:', err)
      });
    });
  }

  // adaugă tranzacție manuală în top
  adaugaTranzactieNoua() {
    const tranzactieNoua: Tranzactie = {
      id: 0,
      dataTranzactie: new Date().toISOString().substring(0, 10),
      tipTranzactie: '',
      suma: 0,
      esteCredit: false,
      esteProcesata: false,
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

    this.dataSource = [tranzactieNoua, ...this.dataSource];
  }

  anuleazaTranzactieNoua(tranzactie: Tranzactie) {
    this.dataSource = this.dataSource.filter(t => t !== tranzactie);
  }

  // calculează sold final pt tranzacția nouă (preview)
  actualizeazaSoldFinal(tranzactie: any) {
    const suma = tranzactie.suma ?? 0;
    const esteCredit = tranzactie.esteCredit === true;

    // index linie nouă
    const indexNou = this.dataSource.findIndex(t => t.id === 0);

    // găsim prima tranzacție de sub ea cu sold valid
    let soldAnterior = 0;
    for (let i = indexNou + 1; i < this.dataSource.length; i++) {
      const t = this.dataSource[i];
      if (t.soldFinal != null && !isNaN(t.soldFinal)) {
        soldAnterior = t.soldFinal;
        break;
      }
    }

    tranzactie.soldFinal = esteCredit
      ? soldAnterior + suma
      : soldAnterior - suma;
  }

  // categorie nouă în global list
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
      },
      error: (err) => console.error('❌ Eroare la adăugare categorie:', err)
    });
  }

  // ===================================================
  // 5. 📊 CHART + HOVER SUM LOGIC
  // ===================================================

  updatePieChart() {
    const grouped: { [key: string]: number } = {};

    this.dataSource.forEach(t => {
      // ignoră credit (venituri)
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

  // bannere hover / sumă incrementală
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

  // ===================================================
  // 6. 🍺 CONSUM (beri / țigări)
  // ===================================================

  calculeazaTotaluri() {
    const tranzactii = this.dataSource || [];

    // beri
    const doarBeri = tranzactii.filter(t => t.nrBeri && t.nrBeri > 0);
    this.totalBeri = doarBeri.reduce(
      (sum, t) => sum + (t.nrBeri || 0),
      0
    );
    this.totalPretBeri = doarBeri.reduce(
      (sum, t) => sum + (t.suma || 0),
      0
    );

    // țigări
    const doarTigari = tranzactii.filter(t => t.nrTigari && t.nrTigari > 0);
    this.totalTigari = doarTigari.reduce(
      (sum, t) => sum + (t.nrTigari || 0),
      0
    );
    this.totalPretTigari = doarTigari.reduce(
      (sum, t) => sum + (t.suma || 0),
      0
    );
  }

  salveazaBeri(tranzactie: Tranzactie) {
    const dto = { nrBeri: tranzactie.nrBeri };
    this.http.put(
      `${environment.apiUrl}/api/tranzactii/update-nrberi/${tranzactie.id}`,
      dto
    ).subscribe({
      next: () => {},
      error: (err) => console.error('❌ Eroare la salvare NrBeri:', err)
    });

    this.calculeazaTotaluri();
  }

  salveazaTigari(tranzactie: Tranzactie) {
    const dto = { nrTigari: tranzactie.nrTigari };
    this.http.put(
      `${environment.apiUrl}/api/tranzactii/update-nrtigari/${tranzactie.id}`,
      dto
    ).subscribe({
      next: () => {},
      error: (err) => console.error('❌ Eroare la salvare NrTigari:', err)
    });

    this.calculeazaTotaluri();
  }

  // ===================================================
  // 7. 💼 BALANȚE REALE (solduri efective)
  // ===================================================

  // filtrare globală (vizual)
  filtreazaTranzactii() {
    if (this.sursaFiltru === 'TOATE') {
      return this.dataSource;
    }
    return this.dataSource.filter(t =>
      (t.sursaCard || '').toUpperCase() === this.sursaFiltru.toUpperCase()
    );
  }

  // filtrare pentru UI / modul curent
  getTranzactiiFiltrate(): Tranzactie[] {
    if (!this.dataSource) return [];
    if (this.filtruSursaVizual === 'TOATE') return this.dataSource;
    return this.dataSource.filter(t =>
      (t.sursaCard || '').toUpperCase() ===
      this.filtruSursaVizual.toUpperCase()
    );
  }

  // calculează balanța curentă pentru o sursă
  getBalanta(sursa: SursaCard): number {
  const tranz = this.dataSource ?? [];
  const excludeCategorie = ['CHIRIE', 'INTRETINERE', 'CHIRIE+INTRETINERE'];

  const venituri = tranz
    .filter(t => (t.sursaCard || '').toUpperCase() === sursa)
    .filter(t => {
      const cat = (t.categorie || '').toUpperCase();
      if (excludeCategorie.some(x => cat.includes(x))) return false;

      const tip = (t.tipTranzactie || '').toLowerCase();
      return (
        t.esteCredit === true ||
        tip.includes('credit') ||
        tip.includes('alimentare') ||
        tip.includes('incasare')
      );
    })
    .reduce((sum, t) => sum + (t.suma ?? 0), 0);

  const cheltuieli = tranz
    .filter(t => (t.sursaCard || '').toUpperCase() === sursa)
    .filter(t => {
      const cat = (t.categorie || '').toUpperCase();
      if (excludeCategorie.some(x => cat.includes(x))) return false;

      const tip = (t.tipTranzactie || '').toLowerCase();
      return (
        t.esteCredit === false ||
        tip.includes('debit') ||
        tip.includes('plata') ||
        tip.includes('cheltuiala') ||
        tip.includes('cumparare')
      );
    })
    .reduce((sum, t) => sum + (t.suma ?? 0), 0);

  const start = this.balanteStart[sursa] ?? 0;
  const balanta = start + venituri - cheltuieli;

  console.log(`🔹 ${sursa}: Venituri ${venituri}, Cheltuieli ${cheltuieli}, Start ${start}, Balanță brută ${balanta}`);

  // 🔸 Afișăm pozitiv (fără semn), doar pentru UI
  return Math.abs(parseFloat(balanta.toFixed(2)));
}



  // profit total (folosim P&L logic, nu balanța)
  getTotalProfit(): number {
    const surse = ['ING', 'PLUXEE'];
    return surse.reduce(
      (total, s) => total + this.getPnlProfit(s),
      0
    );
  }

  // total cheltuieli P&L agregat
  getTotalCheltuieliPnL(): number {
    const surse = ['ING', 'PLUXEE'];
    return surse.reduce(
      (total, s) => total + this.getPnlCheltuieli(s),
      0
    );
  }

  // ===================================================
  // 8. 📈 P&L (Profit & Loss)
  // ===================================================

  // Venituri P&L (salarii, etc) pe sursă
  getPnlVenituri(sursa: string): number {
    return (this.dataSource ?? [])
      .filter(
        t => (t.sursaCard || '').toUpperCase() === sursa.toUpperCase()
      )
      .filter(t => {
        const cat = (t.categorie || '').toUpperCase();
        const esteSalariu = cat.includes('SALARIU');

        if (sursa.toUpperCase() === 'ING') {
          // salariu intră ca CREDIT pe ING
          return esteSalariu && t.esteCredit === true;
        } else if (sursa.toUpperCase() === 'PLUXEE') {
          // salariu intră ca DEBIT pe PLUXEE
          return esteSalariu && t.esteCredit === false;
        }
        return false;
      })
      .reduce((sum, t) => sum + (t.suma ?? 0), 0);
  }

  // Cheltuieli P&L pe sursă (cu netPersonal, excluderi interne)
  // Cheltuieli P&L pe sursă (cu netPersonal, excluderi interne)
getPnlCheltuieli(sursa: string): number {
  return (this.dataSource ?? [])
    .filter(t => (t.sursaCard || '').toUpperCase() === sursa.toUpperCase())
    .filter(t => {
      const cat = (t.categorie || '').toUpperCase();
      const tip = (t.tipTranzactie || '').toLowerCase();

      const esteSalariu = cat.includes('SALARIU');
      const esteTransferIntern =
        cat.includes('TRANSFER') ||
        cat.includes('RETRAGERE') ||
        cat.includes('DEPUNERE');

      // Excludem salarii și mișcări interne (nu sunt cheltuieli)
      if (esteSalariu || esteTransferIntern) return false;

      // Orice tranzacție care e debit, plată sau cumpărare e cheltuială
      const esteCheltuiala =
        t.esteCredit === false ||
        tip.includes('debit') ||
        tip.includes('plata') ||
        tip.includes('cumparare') ||
        tip.includes('purchase');

      return esteCheltuiala;
    })
    .reduce((sum, t) => {
      const netPersonal = t.netPersonal ?? null;

      // 0 → cheltuială comună, nu o contăm
      if (netPersonal === 0) return sum;

      // >0 → luăm doar partea personală
      if (netPersonal && netPersonal > 0) return sum + netPersonal;

      // altfel → întreaga sumă (dacă nu s-a setat netPersonal)
      return sum + Math.abs(t.suma ?? 0);
    }, 0);
}


  // Profit = Venituri - Cheltuieli (P&L)
  getPnlProfit(sursa: string): number {
    return this.getPnlVenituri(sursa) - this.getPnlCheltuieli(sursa);
  }

  // Profit net vizual pentru card box (folosit în UI)
  getProfitNet(sursa: string): number {
    const venituri = this.getTotalVenituri(sursa);
    const cheltuieli = Math.abs(this.getTotalCheltuieli(sursa));
    return venituri - cheltuieli;
  }

  // procent P&L pentru bara verde
  getPnlPercent(sursa: string): number {
    const venituri = this.getTotalVenituri(sursa);
    const cheltuieli = Math.abs(this.getTotalCheltuieli(sursa));
    const total = venituri + cheltuieli;
    return total > 0 ? (venituri / total) * 100 : 0;
  }

  // culoare profit
  getProfitColor(sursa: string): string {
    const profit = this.getProfitNet(sursa);
    return profit >= 0 ? '#00ff88' : '#ff4b4b';
  }

  // total veniturile brute pe sursă (inclusiv retrageri / topup)
  getTotalVenituri(sursa: string): number {
    const tranz = this.dataSource ?? [];
    return tranz
      .filter(t =>
        (t.sursaCard || '').toUpperCase() === sursa.toUpperCase()
      )
      .filter(t => {
        const tip = (t.tipTranzactie || '').toLowerCase();

        // pentru PLUXEE, topup poate fi considerat "venit" ca să știu ce am pe card
        if (sursa.toUpperCase() === 'PLUXEE' && tip.includes('topup')) {
          return true;
        }

        return (
          t.esteCredit === true ||
          tip.includes('credit') ||
          tip.includes('alimentare') ||
          tip.includes('incasare')
        );
      })
      .reduce((sum, t) => {
        const valoare = t.estePersonal && t.netPersonal != null
          ? t.netPersonal
          : (t.suma ?? 0);
        return sum + valoare;
      }, 0);
  }

  // total cheltuielile brute pe sursă (pentru card box, fără netPersonal logic)
  getTotalCheltuieli(sursa: string): number {
    const tranz = this.dataSource ?? [];

    return tranz
      .filter(
        t => (t.sursaCard || '').toUpperCase() === sursa.toUpperCase()
      )
      .filter(t => {
        const tip = (t.tipTranzactie || '').toLowerCase();

        if (sursa.toUpperCase() === 'PLUXEE' && tip.includes('topup')) {
          return false;
        }

        return (
          t.esteCredit === false ||
          tip.includes('debit') ||
          tip.includes('plata') ||
          tip.includes('cheltuiala')
        );
      })
      .reduce((sum, t) => {
        // pentru card box vrem cheltuiala brută / netPersonal dacă e marcat personal?
        const valoare = t.estePersonal && t.netPersonal != null
          ? t.netPersonal
          : (t.suma ?? 0);

        return sum + valoare;
      }, 0);
  }

  // ===================================================
  // 9. 🗓 P&L LUNAR / SALVARE
  // ===================================================

  filtreazaDupaLuna(event: any) {
    this.lunaSelectata = event.value;
    const luna = this.lunaSelectata.getMonth() + 1;
    const an = this.lunaSelectata.getFullYear();

    // filtrează doar tranzacțiile din luna/ anul selectat
    this.dataSourceFiltrat = this.dataSource.filter(t => {
      const d = t.dataTranzactie
        ? new Date(t.dataTranzactie)
        : new Date(0);
      return (
        d.getMonth() + 1 === luna &&
        d.getFullYear() === an
      );
    });

    this.recalculeazaBalante();
  }

  setLuna(event: Date, datepicker: any) {
    this.lunaSelectata = event;
    this.filtreazaDupaLuna({ value: event });
    datepicker.close();
  }

  recalculeazaBalante() {
    this.loadTotalePeSurse();
    this.calculeazaTotaluri();
    this.updatePieChart();
  }




  salveazaPnlCurent() {
    const luna = this.lunaSelectata.getMonth() + 1;
    const an = this.lunaSelectata.getFullYear();

    const pnl = [
      {
        Sursa: 'ING',
        Venituri: this.getTotalVenituri('ING'),
        Cheltuieli: this.getTotalCheltuieli('ING'),
        Profit: this.getProfitNet('ING')
      },
      {
        Sursa: 'PLUXEE',
        Venituri: this.getTotalVenituri('PLUXEE'),
        Cheltuieli: this.getTotalCheltuieli('PLUXEE'),
        Profit: this.getProfitNet('PLUXEE')
      }
    ];

    pnl.forEach(p => {
      this.http.post(
        `${environment.apiUrl}/api/tranzactii/salveaza-pnl`,
        { Luna: luna, An: an, ...p }
      ).subscribe({
        next: () => {},
        error: (err) => console.error('❌ Eroare la salveaza-pnl:', err)
      });
    });
  }

  // ===================================================
  // 10. 🧰 HELPERI / UI
  // ===================================================

  toggleDashboardMode() {
    this.showBalanceMode = !this.showBalanceMode;
  }

  hasSelection(): boolean {
    try {
      return Array.isArray(this.dataSource) &&
        this.dataSource.some(t => !!t?.selected);
    } catch {
      return false;
    }
  }

  isMagazinOCR(merchant: string): boolean {
    if (!merchant) return false;
    const text = merchant.toLowerCase();
    return (
      text.includes('lidl') ||
      text.includes('penny') ||
      text.includes('kaufland')
    );
  }
  
  // compatibilitate cu template-ul existent
esteMagazinOCR(merchant: string): boolean {
  return this.isMagazinOCR(merchant);
}

  formatDetaliiTooltip(element: Tranzactie): string {
    if (!element.detalii) return 'Bon OCR fără detalii disponibile.';
    try {
      const produse = JSON.parse(element.detalii);
      if (Array.isArray(produse)) {
        return produse.map((p: any) =>
          `• ${p.nume ?? p} – ${p.suma?.toFixed?.(2) ?? ''} lei`
        ).join('\n');
      }
    } catch {
      // fallback dacă detalii nu e JSON valid
    }
    return element.detalii;
  }

  openOcrPreviewDialog(
    parentId: number,
    grupuri: any[],
    totalOcr: number,
    totalParent: number
  ) {
    const dlg = this.dialog.open(OcrPreviewDialogComponent, {
      width: '700px',
      data: { parentId, grupuri, totalOcr, totalParent }
    });

    dlg.afterClosed().subscribe((confirmat: boolean) => {
      if (confirmat) {
        this.http.post(
          `${environment.apiUrl}/api/tranzactii/confirm-ocr`,
          {
            parentId,
            grupuri: grupuri.map(g => ({
              categorie: g.categorie,
              total: g.total
            }))
          }
        ).subscribe({
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

  showJsonDialog(jsonText: string) {
    const dlg = window.open(
      '',
      '_blank',
      'width=800,height=600,scrollbars=yes,resizable=yes'
    );
    if (dlg) {
      dlg.document.write(
        `<pre style="white-space:pre-wrap;font-family:monospace;font-size:13px">${jsonText}</pre>`
      );
    }
  }

  private filtreazaCategorii(input: string): string[] {
    const val = input.toLowerCase();
    return this.categorii.filter(cat =>
      cat.toLowerCase().includes(val)
    );
  }

  // sync header custom (peste tabel scrollabil sticky)
  private syncHeaderWidth() {
    try {
      const matHeader = document.querySelector(
        'table.mat-mdc-table thead tr'
      );
      const tableHeaderDivs = document.querySelectorAll(
        '.header-row div'
      );

      if (!matHeader || tableHeaderDivs.length === 0) return;

      const ths = Array.from(
        matHeader.querySelectorAll('th')
      ).filter(th =>
        (th as HTMLElement).offsetParent !== null
      );

      const count = Math.min(ths.length, tableHeaderDivs.length);
      for (let i = 0; i < count; i++) {
        const width = (ths[i] as HTMLElement).offsetWidth + 'px';
        (tableHeaderDivs[i] as HTMLElement).style.width = width;
      }
    } catch (e) {
      console.warn('❌ Eroare la syncHeaderWidth:', e);
    }
  }

  private scrollHandler = () => {
    this.scrolling = true;
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(
      () => (this.scrolling = false),
      200
    );
  };
  
  cancel(element?: any) {
  this.cancelEdit(element);
}

// ======================
// 🗓️ SCHIMBARE LUNĂ
// ======================
onMonthSelected(event: Date, picker: any) {
  // 🔹 Actualizăm luna selectată
  this.lunaSelectata = event;
  picker.close();

  // 🔹 Reîmprospătăm valorile P&L din DB
  this.onLunaSchimbata({ value: event });
}

onLunaSchimbata(event: any) {
  const dateObj = new Date(event.value || this.lunaSelectata);
  const luna = dateObj.getMonth() + 1;
  const an = dateObj.getFullYear();

  console.log(`📆 Schimbare lună detectată → ${luna}/${an}`);

  // 🔄 Reset temporar pentru P&L până se încarcă
  this.pnlIng = { venituri: 0, cheltuieli: 0, profit: 0 };
  this.pnlPluxee = { venituri: 0, cheltuieli: 0, profit: 0 };
  this.profitHeader = 0;
  this.cheltuieliHeader = 0;
  this.cdr.detectChanges();

  // 🔹 Dacă e luna curentă → folosim valorile live din tranzacțiile existente
  if (luna === new Date().getMonth() + 1 && an === new Date().getFullYear()) {
    this.pnlIng = {
      venituri: this.getPnlVenituri('ING'),
      cheltuieli: this.getPnlCheltuieli('ING'),
      profit: this.getPnlProfit('ING')
    };
    this.pnlPluxee = {
      venituri: this.getPnlVenituri('PLUXEE'),
      cheltuieli: this.getPnlCheltuieli('PLUXEE'),
      profit: this.getPnlProfit('PLUXEE')
    };

    // 🟩 Actualizăm headerul pe baza valorilor live
    this.profitHeader = this.pnlIng.profit + this.pnlPluxee.profit;
    this.cheltuieliHeader = this.pnlIng.cheltuieli + this.pnlPluxee.cheltuieli;
    this.cdr.detectChanges();
    console.log(`🟢 Header LIVE → Profit: ${this.profitHeader}, Cheltuieli: ${this.cheltuieliHeader}`);
    return;
  }

  // 🟦 Cerem valorile salvate în DB pentru luna selectată
  this.http.get<any[]>(`${environment.apiUrl}/api/tranzactii/pnl/${an}/${luna}`)
    .subscribe({
      next: (data) => {
        console.log('📦 Date P&L primite:', data);

        if (Array.isArray(data) && data.length > 0) {
          const pnlIng = data.find(p => p.sursa?.toUpperCase() === 'ING');
          const pnlPluxee = data.find(p => p.sursa?.toUpperCase() === 'PLUXEE');

          // ✅ Actualizăm cardurile P&L
          this.pnlIng = pnlIng ? {
            venituri: pnlIng.venituri ?? 0,
            cheltuieli: pnlIng.cheltuieli ?? 0,
            profit: pnlIng.profit ?? 0
          } : { venituri: 0, cheltuieli: 0, profit: 0 };

          this.pnlPluxee = pnlPluxee ? {
            venituri: pnlPluxee.venituri ?? 0,
            cheltuieli: pnlPluxee.cheltuieli ?? 0,
            profit: pnlPluxee.profit ?? 0
          } : { venituri: 0, cheltuieli: 0, profit: 0 };

        } else {
          this.pnlIng = { venituri: 0, cheltuieli: 0, profit: 0 };
          this.pnlPluxee = { venituri: 0, cheltuieli: 0, profit: 0 };
        }

        // 🟣 Actualizăm bannerele de sus exact după ce vin datele
        this.profitHeader = (this.pnlIng.profit || 0) + (this.pnlPluxee.profit || 0);
        this.cheltuieliHeader = (this.pnlIng.cheltuieli || 0) + (this.pnlPluxee.cheltuieli || 0);

        console.log(`🟣 Header UPDATE (din DB) → Profit: ${this.profitHeader}, Cheltuieli: ${this.cheltuieliHeader}`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Eroare la preluarea P&L:', err);
        this.pnlIng = { venituri: 0, cheltuieli: 0, profit: 0 };
        this.pnlPluxee = { venituri: 0, cheltuieli: 0, profit: 0 };
        this.profitHeader = 0;
        this.cheltuieliHeader = 0;
        this.cdr.detectChanges();
      }
    });
}



// ======================
// 💾 Salvare directă P&L
// ======================
salveazaPnlDirect() {
  const luna = this.lunaSelectata.getMonth() + 1;
  const an = this.lunaSelectata.getFullYear();

  const surse = [
    {
      Sursa: 'ING',
      Venituri: this.getTotalVenituri('ING'),
      Cheltuieli: this.getTotalCheltuieli('ING'),
      Profit: this.getProfitNet('ING')
    },
    {
      Sursa: 'PLUXEE',
      Venituri: this.getTotalVenituri('PLUXEE'),
      Cheltuieli: this.getTotalCheltuieli('PLUXEE'),
      Profit: this.getProfitNet('PLUXEE')
    }
  ];

  surse.forEach(p => {
    this.http.post(`${environment.apiUrl}/api/tranzactii/salveaza-pnl`, {
      Luna: luna,
      An: an,
      ...p
    }).subscribe({
      next: () => console.log(`✅ P&L salvat pentru ${p.Sursa} (${luna}/${an})`),
      error: err => console.error('❌ Eroare la salvare P&L:', err)
    });
  });
}

toggleViewMode() {
  this.showBalanceMode = !this.showBalanceMode;

  // 🔹 Așteaptă finalizarea animației flip (300ms) și actualizează P&L
  if (!this.showBalanceMode) {
    setTimeout(() => {
      this.onLunaSchimbata({ value: this.lunaSelectata });
    }, 350);
  }
  
  
  // 🔁 Reîmprospătăm bannerele din header
  setTimeout(() => {
    this.profitHeader = (this.pnlIng.profit || 0) + (this.pnlPluxee.profit || 0);
    this.cheltuieliHeader = (this.pnlIng.cheltuieli || 0) + (this.pnlPluxee.cheltuieli || 0);
    this.cdr.detectChanges();
  }, 500);
  
  
}

toggleDropdownLuni() {
  this.showDropdownLuni = !this.showDropdownLuni;
}

isLunaActiva(luna: any): boolean {
  return this.lunaSelectata?.getMonth() === luna.index;
}

selecteazaLuna(luna: any) {
  const an = this.lunaSelectata?.getFullYear() || new Date().getFullYear();
  this.lunaSelectata = new Date(an, luna.index, 1);
  this.showDropdownLuni = false;
  this.onLunaSchimbata({ value: this.lunaSelectata }); // apelează logica ta existentă
  
  // 🟣 Dacă suntem pe modul "Balanță", comutăm automat pe "P&L"
  if (this.showBalanceMode) {
    console.log('🔄 Comut automat la modul P&L după schimbarea lunii');
    this.toggleDashboardMode(); // metoda ta existentă
  }
}

getNumeLuna(date: Date): string {
  if (!date) return '';
  return `${this.luni[date.getMonth()].nume} ${date.getFullYear()}`;
}

toggleChartEvolutie() {
  this.showChartEvolutie = !this.showChartEvolutie;
  if (this.showChartEvolutie) this.loadProfitChart();
}

loadProfitChart() {
  const luni = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
  ];

  const anulCurent = new Date().getFullYear();

  // Inițializăm cu zero
  const profitPeLuna = new Array(12).fill(0);
  const cheltuieliPeLuna = new Array(12).fill(0);

  this.http.get<any[]>(`${environment.apiUrl}/api/tranzactii/pnl/${anulCurent}`)
  .subscribe({
    next: (rows) => {
      console.log('📦 Date PNL primite:', rows); // <--- vezi în consolă cum vin

      if (Array.isArray(rows) && rows.length > 0) {
        rows.forEach(r => {
          const lunaIndex =
            (r.luna ?? r.Luna ?? r.LUNA) - 1; // compatibil cu orice formă

          profitPeLuna[lunaIndex] =
            r.profitTotal ?? r.Profittotal ?? r.ProfitTotal ?? r.profit ?? 0;

          cheltuieliPeLuna[lunaIndex] =
            r.cheltuieliTotal ?? r.Cheltuielitotal ?? r.CheltuieliTotal ?? r.cheltuieli ?? 0;
        });
      }

      // 🔹 reconstruim graficul
      this.profitChartData = {
        labels: luni,
        datasets: [
          {
            label: 'Profit lunar (lei)',
            data: profitPeLuna,
            borderColor: '#00ff99',
            backgroundColor: 'rgba(0,255,150,0.15)',
            borderWidth: 4,
            tension: 0.4,
            pointRadius: 6,
            pointBackgroundColor: '#00ff99',
            fill: true,
          },
          {
            label: 'Cheltuieli lunare (lei)',
            data: cheltuieliPeLuna,
            borderColor: '#ff5555',
            backgroundColor: 'rgba(255,85,85,0.1)',
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#ff6666',
            fill: false,
          }
        ]
      };
    },
    error: (err) => console.error('Eroare la PNL anual:', err)
  });
}




adaugaCopilTigari(tranzactieParinte: any) {
  if (!tranzactieParinte) return;

  const sumaTigari = 27.5;
  const sumaParinte = Number(tranzactieParinte.suma) || 0;
  const diferenta = Math.max(sumaParinte - sumaTigari, 0);

  // 🔸 copil 1: ȚIGĂRI
  const copilTigari: Partial<Tranzactie> = {
  id: 0,
  parentId: tranzactieParinte.id,
  isSplitChild: true,
  categorie: 'ȚIGĂRI',
  suma: sumaTigari,
  nrTigari: 1,
  esteCredit: false,
  dataTranzactie: tranzactieParinte.dataTranzactie,
  merchant: tranzactieParinte.merchant,
  detalii: 'Tranzacție automată (ȚIGĂRI)',
  tipTranzactie: tranzactieParinte.tipTranzactie || 'Copil automat',
  esteProcesata: false,
  sursaCard: tranzactieParinte.sursaCard || '',
  soldFinal: tranzactieParinte.soldFinal || 0
};

  // 🔸 copil 2: DIFERENȚĂ
const copilDiferenta: Partial<Tranzactie> = {
  id: 0,
  parentId: tranzactieParinte.id,
  isSplitChild: true,
  categorie: 'ALTE (diferență automat)',
  suma: diferenta,
  esteCredit: false,
  sursaCard: tranzactieParinte.sursaCard,
  dataTranzactie: tranzactieParinte.dataTranzactie,
  merchant: tranzactieParinte.merchant,
  detalii: `Diferență automată (+${diferenta.toFixed(2)} lei)`,
  tipTranzactie: tranzactieParinte.tipTranzactie || 'Copil automat',
  esteProcesata: false,
  soldFinal: tranzactieParinte.soldFinal || 0
};

  



  // 🔹 Adăugăm vizual
  this.dataSource = [
  ...this.dataSource,
  copilTigari as Tranzactie,
  copilDiferenta as Tranzactie
];


  // 🔹 Salvăm în DB (opțional)
  this.http.post(`${environment.apiUrl}/api/tranzactii`, [copilTigari, copilDiferenta])
    .subscribe({
      next: () => console.log('✅ Copii ȚIGĂRI + DIFERENȚĂ adăugați automat!'),
      error: err => console.error('Eroare la adăugare copii:', err)
    });

  // 🔹 Log frumos pentru debug
  console.log(`🚬 Copil creat: ${sumaTigari} lei ȚIGĂRI`);
  console.log(`⚖️ Copil diferență: ${diferenta} lei`);
}



}
