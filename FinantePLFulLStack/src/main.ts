import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app/app';   // ✅ corect — exact cum ai fișierul
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []),
    importProvidersFrom(HttpClientModule),
    provideAnimations()
  ]
})
.catch((err) => console.error(err));

if (environment.production && !environment.allowConsoleLogs) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
}
