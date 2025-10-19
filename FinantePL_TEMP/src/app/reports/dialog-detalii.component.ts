import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dialog-detalii',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatTableModule, MatIconModule],
  template: `
    <div class="dialog-modern">
      <h3>
        <mat-icon class="icon-folder">folder_open</mat-icon>
        <span>Detalii tranzacții – </span>
        <span class="categorie">{{ data.categorie }}</span>
      </h3>

      <div class="tabel-container">
        <table class="tabel-tranzactii">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descriere</th>
              <th class="right">Suma</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let t of data.tranzactii">
              <td>{{ t.dataTranzactie | date:'dd/MM/yyyy' }}</td>
              <td>{{ t.descriere }}</td>
              <td class="right">{{ t.suma | number:'1.2-2' }} lei</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    /* ===== STRUCTURĂ GENERALĂ ===== */
    .dialog-modern {
      background: rgba(30, 32, 48, 0.9);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.5);
      color: #e0e0e0;
      font-family: 'Segoe UI', sans-serif;
      backdrop-filter: blur(6px);
      max-height: 80vh;
      overflow: hidden;
    }

    /* ===== TITLU ===== */
    h3 {
      display: flex;
      align-items: center;
      font-weight: 600;
      font-size: 1.05rem;
      margin-bottom: 1rem;
      color: #f5f5f5;
    }

    .icon-folder {
      color: #ffeb3b;
      margin-right: 8px;
      font-size: 22px;
    }

    .categorie {
      color: #90caf9;
      font-weight: 600;
      margin-left: 4px;
    }

    /* ===== CONTAINER TABEL ===== */
    .tabel-container {
      max-height: 60vh;
      overflow-y: auto;
      border-radius: 8px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
    }

    /* ===== TABEL ===== */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
      color: #f0f0f0;
    }

    th, td {
      padding: 10px 14px;
    }

    thead th {
      position: sticky;
      top: 0;
      background: rgba(45, 47, 70, 0.95);
      color: #bbdefb;
      font-weight: 600;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      z-index: 1;
    }

    tbody tr:nth-child(even) {
      background: rgba(255,255,255,0.03);
    }

    tbody tr:hover {
      background: rgba(144,202,249,0.15);
      transition: background 0.2s ease;
    }

    .right {
      text-align: right;
      font-weight: 500;
    }

    /* ===== DIALOG BORDER & SHADOW ===== */
    ::ng-deep .mat-mdc-dialog-surface {
      background: transparent !important;
      box-shadow: none !important;
      border-radius: 18px;
    }

    /* ===== SCROLLBAR CUSTOM ===== */
    .tabel-container::-webkit-scrollbar {
      width: 8px;
    }

    .tabel-container::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.15);
      border-radius: 4px;
    }

    .tabel-container::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,0.3);
    }
  `]
})
export class DialogDetaliiComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}
