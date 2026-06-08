import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <nav class="navbar">
      <div class="nav-container">
        <h1 class="logo">Demo App</h1>
        <ul class="nav-menu">
          <li><a routerLink="/home" routerLinkActive="active">Home</a></li>
          <li><a routerLink="/about" routerLinkActive="active">About</a></li>
        </ul>
      </div>
    </nav>
    <router-outlet></router-outlet>
  `,
  styles: [`
    .navbar {
      background-color: #dd0031;
      padding: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .nav-container {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2rem;
    }

    .logo {
      color: white;
      margin: 0;
      font-size: 1.5rem;
    }

    .nav-menu {
      list-style: none;
      display: flex;
      gap: 2rem;
      margin: 0;
      padding: 0;
    }

    .nav-menu a {
      color: white;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      transition: background-color 0.3s;
    }

    .nav-menu a:hover {
      background-color: rgba(255,255,255,0.1);
    }

    .nav-menu a.active {
      background-color: rgba(255,255,255,0.2);
      font-weight: bold;
    }
  `]
})
export class AppComponent {
  title = 'demo-app';
}
