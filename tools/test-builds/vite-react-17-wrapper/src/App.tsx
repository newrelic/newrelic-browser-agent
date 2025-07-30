import React from 'react';
import './App.css';
import SampleTrigger from './SampleTrigger';
import Popover from './Popover';
import PopoverTrigger from './PopoverTrigger';
import PopoverBody from './PopoverBody';

export default function App() {
  const [clickCount, updateClickCount] = React.useState(0);
  return (
    <>
      <h1>Vite React</h1>
      <div>
        <span id={"dummy-span-1"}></span>
        <span id={"dummy-span-2"}></span>
        <p><strong>Click count: { clickCount } </strong></p>
        <p>Span with a click event handler, added via `onclick` ={'>'}
          <span id="span-with-onclick" onClick={() => { updateClickCount(clickCount + 1)}} className="non-interactive-element">Span </span>
        </p>
        <p>Span with no handlers ={'>'}
          <span id="do-nothing-span" className="non-interactive-element">Span</span>
        </p>
      </div>
      <hr/>
      <Popover>
        <PopoverTrigger>
          <SampleTrigger id="sample-trigger" title="Sample Trigger"/>
        </PopoverTrigger>
        <PopoverBody>
          <div className="popover-content">
            <p>This is the content of the popover.</p>
            <p>You can add more elements here.</p>
          </div>
        </PopoverBody>
      </Popover>
    </>
  );
}
