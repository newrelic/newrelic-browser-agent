import React, { createRef, PureComponent } from "react";

interface SampleTriggerProps {
  id: string;
  title: string;
}

export default class SampleTrigger extends PureComponent<SampleTriggerProps> {
  _rootRef: any;
  _buttonRef: any;

  constructor(props: SampleTriggerProps) {
    super(props);

    this._rootRef = createRef();
    this._buttonRef = createRef();
  }

  render() {
    const { id, title } = this.props;
    return (
      <div
        ref={this._rootRef}
        className="wnd-DropdownTrigger"
      >
        <button ref={this._buttonRef} id={id} type="button">
          <span>
            <span>{title}</span>
            <span style={{ fontSize: '8px', marginLeft: '8px', display: 'inline-block', height: '1em', width: '1em' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" focusable="false">
                <path fillRule="evenodd" d="M6.6 2L4 4.7 1.4 2l-.8.8L4 6.1l3.4-3.3-.8-.8z" clipRule="evenodd"></path></svg></span>
          </span>
        </button>
      </div>
    );
  }
}
