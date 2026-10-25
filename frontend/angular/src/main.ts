import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { AppComponent } from './app.component';

bootstrapApplication(AppComponent, { providers: [provideHttpClient()] }).catch((error: unknown) => console.error(error));