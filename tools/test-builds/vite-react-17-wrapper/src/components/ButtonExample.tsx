import React from "react";

const ButtonExample = () => {
  const [clickCount, updateClickCount] = React.useState(0);

  return (
    <>
      <div className={"example-container"}>
        <h2>Buttons</h2>
        <div>
          <p><strong>Click count: { clickCount } </strong></p>
          <p>Button with a click event handler, added via `onclick` ={'> '}
            <button id="button-with-onclick" onClick={() => { updateClickCount(clickCount + 1)}}> Button </button>
          </p>
          <p>Button with no handlers ={'> '}
            <button id="do-nothing-button">Do nothing</button>
          </p>
        </div>
        <div>
          <p>Button with listener + span child ={'> '}
            <button id="button-with-listener-and-span-child">
              <span id="span-inside-button-with-listener" onClick={() => { updateClickCount(clickCount + 1)}}> Button </span>
            </button>
          </p>

          <p>Dead button +  span child ={'> '}
            <button id="dead-button-with-span-child">
              <span id="span-inside-dead-button">Dead button</span>
            </button>
          </p>
        </div>
      </div>
      <div className={"example-container"}>
        <h2>Buttons and forms</h2>
        <p>Button with a form ancestor
          <form id="form-with-button-child">
            <input type="checkbox" id="bar1" name="foo" value="bar1" checked/>
            <label htmlFor="bar1">bar</label>
            <button id="button-with-form-ancestor">Button w/ form ancestor</button>
          </form>
        </p>

        <p>Button with a related form
          <form id="form-with-related-button">
            <input type="checkbox" id="bar2" name="foo" value="bar2" checked/>
            <label htmlFor="bar2">bar</label>
          </form>
          <button id="button-with-related-form" form="form-with-related-button">Button w/ related form</button>
        </p>

        <p>Button with an invalid form
          <form id="form-with-no-valid-button">
            <input type="checkbox" id="bar3" name="foo" value="bar3" checked/>
            <label htmlFor="bar3">bar</label>
            <button id="button-with-invalid-form" form="does-not-exist">Button w/ non-existent form</button>
          </form>
        </p>
      </div>
    </>
  )
}

export default ButtonExample;
