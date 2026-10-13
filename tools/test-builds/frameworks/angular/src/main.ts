// Make sure newrelic is the first thing imported
import './newrelic';

import { platformBrowser } from '@angular/platform-browser';

import { AppModule } from './app/app.module';


platformBrowser().bootstrapModule(AppModule)
  .catch(err => console.error(err));
