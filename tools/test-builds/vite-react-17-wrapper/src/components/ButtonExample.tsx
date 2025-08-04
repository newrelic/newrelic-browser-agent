import React from "react";

const ButtonExample = () => {
  const [clickCount, updateClickCount] = React.useState(0);

  return (
    <div className={"example-container"}>
      <h2>Buttons</h2>
      <div>
        <p><strong>Click count: { clickCount } </strong></p>
        <p>Button with a click event handler, added via `onclick` ={'>'}
          <button id="button-with-onclick" onClick={() => { updateClickCount(clickCount + 1)}}> Button </button>
        </p>
        <p>Button with no handlers ={'>'}
          <button id="do-nothing-button">Do nothing</button>
        </p>
      </div>
    </div>
  )
}

export default ButtonExample;
