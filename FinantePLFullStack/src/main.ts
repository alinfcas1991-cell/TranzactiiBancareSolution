import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app/app';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

// 🔹 Asta lipsea — importăm adapterul pentru date
import { provideNativeDateAdapter } from '@angular/material/core';

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []),
    importProvidersFrom(HttpClientModule),
    provideAnimations(),
    provideNativeDateAdapter()   // ✅ corect și complet
  ]
})
.catch((err) => console.error(err));

if (environment.production && !environment.allowConsoleLogs) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
}
