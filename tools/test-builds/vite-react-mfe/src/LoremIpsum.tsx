import axios from 'axios';
import { lazy, Suspense, useState } from 'react';

const LazyLoremIpsum = lazy(() => import('./LoremIpsumLazy').then(module => ({ default: module.LoremIpsumLazy })));

export function LoremIpsum() {
  const [showLazy, setShowLazy] = useState(false);

  return (
    <div>
        {showLazy && (
        <Suspense fallback={<div>Loading...</div>}>
          <LazyLoremIpsum />
        </Suspense>
      )}
      <h2>Lorem Ipsum</h2>
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
        veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
        commodo consequat.
      </p>
      <p>
        Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
        dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
        proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
      </p>
      <button id="mfe-main-button" onClick={() => {
        console.log("click in MFE")
        const xhr = new XMLHttpRequest();
        // xhr.open('GET', '/fetch');
        // xhr.send();
        axios.get('/json').then(response => {
            console.log('Received /json response:', response.data);
        }).catch(error => {
            console.error('Error fetching /json:', error);
        });
        setShowLazy(true);
        throw new Error('test');
      }}>Click Me To Throw an Error and Lazy Load more content</button>
    </div>
  );
}
