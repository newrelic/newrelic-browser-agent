import React from "react";

const LinkExample = () => {
  const [clickCount, updateClickCount] = React.useState(0);

  return (
    <>
      <div className={"examples"}>
        <h2>Links</h2>
        <div>
          <p><strong>Click count: { clickCount } </strong></p>
          <p>Link with a click event handler ={'> '}
            <a id="test-link-with-listener" onClick={() => { updateClickCount(clickCount + 1)}}>Link</a>
          </p>

          <p>Link with href ={'> '}
            <a id="test-link-with-href" href="https://www.example.com">Go to Example.com</a>
          </p>

          <p>Dead link ={'> '}
            <a id="dead-link">Link</a>
          </p>

          <p>Link with error ={'> '}
            <a id="link-with-error" onClick={() => { throw new Error('This link throws an error' )}}>Link w/ error</a>
          </p>
          <p>Link with noticeError ={'> '}
            <a id="link-with-notice-error" onClick={() => { NREUM?.noticeError(new Error('Report caught error to New Relic')) }}>Link w/ noticeError</a>
          </p>

          <p>Link with a click event handler + span child ={'> '}
            <a id="link-with-listener-and-span-child">
              <span id="span-inside-link-with-listener" onClick={() => { updateClickCount(clickCount + 1)}}>Link</span>
            </a>
          </p>
          <p>Dead link + span child ={'> '}
            <a id="dead-link-with-span-child">
              <span id="span-inside-dead-link">Link</span>
            </a>
          </p>
        </div>
      </div>
    </>
  )
}

export default LinkExample
