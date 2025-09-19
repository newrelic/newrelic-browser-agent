import React from 'react';
import './App.css';
import Popover from "./components/dropdown/Popover";
import PopoverTrigger from "./components/dropdown/PopoverTrigger";
import PopoverBody from "./components/dropdown/PopoverBody";
import SampleTrigger from "./components/dropdown/SampleTrigger";
import SpanExample from "./components/SpanExample";
import ButtonExample from "./components/ButtonExample";
import LinkExample from "./components/LinkExample";

export default function App() {
  return (
    <>
      <h1>Vite React</h1>
      <div className='example-container'>
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
      </div>
      <hr/>
      <div className='example-container'>
        <ButtonExample />
        <LinkExample />
        <SpanExample />
      </div>
    </>
  );
}
