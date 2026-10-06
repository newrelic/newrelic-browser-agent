import React, { forwardRef } from "react";

interface SampleTriggerProps {
  id: string;
  title: string;
}

const SampleTrigger = forwardRef<HTMLDivElement, SampleTriggerProps>(({ id, title }, ref) => (
  <div
    ref={ref}
    className="wnd-DropdownTrigger"
  >
    <button id={id} type="button">
      <span>
        <span>{title}</span>
        <span style={{ fontSize: '8px', marginLeft: '8px', display: 'inline-block', height: '1em', width: '1em' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" focusable="false">
            <path fillRule="evenodd" d="M6.6 2L4 4.7 1.4 2l-.8.8L4 6.1l3.4-3.3-.8-.8z" clipRule="evenodd"></path></svg></span>
      </span>
    </button>
  </div>
));

export default SampleTrigger;
