import { Routes } from '@angular/router';
import { TranzactiiComponent } from './tranzactii/tranzactii';
import { ReportsComponent } from './reports/reports';
import { SettingsComponent } from './settings/settings';
import { DashboardComponent } from './dashboard/dashboard';

export const routes: Routes = [
  { path: '', component: DashboardComponent },  
  { path: 'tranzactii', component: TranzactiiComponent },
  { path: 'venituri', component: TranzactiiComponent, data: { filter: 'credit' } },
  { path: 'cheltuieli', component: TranzactiiComponent, data: { filter: 'debit' } },
  { path: 'rapoarte', component: ReportsComponent },
  { path: 'setari', component: SettingsComponent }
];
