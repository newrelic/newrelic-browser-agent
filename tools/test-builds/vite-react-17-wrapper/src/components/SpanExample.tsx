import React from "react";

const SpanExample = () => {
  const [clickCount, updateClickCount] = React.useState(0);

  return (
    <div className={"example-container"}>
      <h2>Other Elements</h2>
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
        <p>Span with error ={'>'}
          <span id="span-with-error" onClick={() => {throw new Error('This span throws an error' )}}> Span w/ error </span>
        </p>
      </div>
    </div>
  )
}

export default SpanExample;
