import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  template: `
    <div class="about-container">
      <h1>About Us</h1>
      <p>This is the demo application's About page.</p>
      <h2>App info</h2>
      <ul>
        <li>Name: Demo App</li>
        <li>Version: 1.0.0</li>
        <li>Framework: Angular</li>
      </ul>
      <h2>Lorem Ipsum</h2>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis nec suscipit sem. Duis non aliquet mi, et pretium nulla.</p>
    </div>
  `,
  styles: [`
    .about-container {
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      font-family: Arial, sans-serif;
    }

    h1 {
      color: #dd0031;
      border-bottom: 2px solid #dd0031;
      padding-bottom: 10px;
    }

    h2 {
      color: #333;
      margin-top: 30px;
    }

    p {
      line-height: 1.6;
      color: #666;
    }

    ul {
      list-style-type: none;
      padding: 0;
    }

    li {
      padding: 10px;
      margin: 5px 0;
      background-color: #f5f5f5;
      border-left: 4px solid #dd0031;
    }
  `]
})
export class AboutComponent {}
