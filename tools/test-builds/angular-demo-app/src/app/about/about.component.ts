import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  template: `
    <div class="about-container">
      <h1>About Us</h1>
      <p>これはデモアプリケーションのAboutページです。</p>
      <h2>アプリケーション情報</h2>
      <ul>
        <li>名前: Demo App</li>
        <li>バージョン: 1.0.0</li>
        <li>フレームワーク: Angular</li>
      </ul>
      <h2>説明</h2>
      <p>このアプリケーションは、Angularを使用したモダンなWebアプリケーションです。</p>
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
