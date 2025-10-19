import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>⚙️ Setări aplicație</h2>
    <p>Aici vei putea schimba preferințe și configurări.</p>
  `
})
export class SettingsComponent {}
