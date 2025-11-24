import React, { cloneElement, createRef, PureComponent } from "react";
import ReferenceCurrentRef from "./ReferenceCurrentRef";
import { PopoverBodyContext, PopoverTriggerContext } from "./popover-context";

type Props = {
  children: any;
  onChange?: (evt: Event, opened: boolean) => void;
  opened?: boolean;
};
type State = {
    opened: boolean;
    triggerNode: HTMLElement | null;
    triggerRef: any;
    bodyNode: HTMLElement | null;
    bodyRef: any;
}
export default class Popover extends PureComponent<Props, State> {
    _sectionRefs: {};
    _fallbackBodyRef: React.RefObject<unknown>;
    _fallbackTriggerRef: React.RefObject<unknown>;
    _onClickDelegated: any;

    static getDerivedStateFromProps({ opened }: { opened?: boolean}) {
            if (typeof opened === 'boolean') {
                return {
                    opened,
                };
            }

            return null;
        }

        constructor(props: Props) {
            super(props);

            this.state = {
                opened: false,
                triggerNode: null,
                triggerRef: null,
                bodyNode: null,
                bodyRef: null,
            };

            this._sectionRefs = {};

            this._fallbackBodyRef = createRef();
            this._fallbackTriggerRef = createRef();

            this._onActionOutside = this._onActionOutside.bind(this);
            this._onClick = this._onClick.bind(this);
            this._setBodyNode = this._setBodyNode.bind(this);
            this._setBodyRef = this._setBodyRef.bind(this);
            this._setTriggerNode = this._setTriggerNode.bind(this);
            this._setTriggerRef = this._setTriggerRef.bind(this);
            this._setOpenedState = this._setOpenedState.bind(this);
            this._delegateTriggerHandler = this._delegateTriggerHandler.bind(this);

            this._onClickDelegated = this._delegateTriggerHandler(this._onClick);
        }

        componentWillUnmount() {
            const oldRef = this.state.triggerNode;

            // Clean up properly so there aren't any event handler leaks
            if (oldRef) {
                const oldWindow = oldRef.ownerDocument.defaultView;
                oldWindow?.removeEventListener('click', this._onActionOutside);
                oldWindow?.removeEventListener('click', this._onClickDelegated);
            }
        }

        _delegateTriggerHandler(handler: (evt: Event) => void) {
            return (evt: Event) => {
                if (this.state.triggerNode && this.state.triggerNode.contains(evt.target as HTMLElement)) {
                    return handler(evt);
                }
            };
        }

        _focusTrigger() {
            this.state.triggerRef?.focus();
        }

        _isControlled() {
            return typeof this.props.opened === 'boolean';
        }

        _onActionOutside(evt: Event) {
            if (!this.state.opened) {
                return;
            }

            for (let node: ParentNode | null = evt.target as ParentNode; node; node = node.parentNode) {
                if (node === this.state.triggerNode || node === this.state.bodyNode) {
                    return;
                }
            }

            if (this._isControlled()) {
                this.props.onChange?.(evt, false);
            } else {
                this.state.bodyRef.close(evt);
            }
        }

        _onClick(evt: Event) {
            const { bodyRef, opened } = this.state;

            if (!evt.defaultPrevented) {
                if (this._isControlled()) {
                    this.props.onChange?.(evt, !opened);
                } else {
                    bodyRef.toggle(evt, !opened);
                }
            }
        }

        _setBodyNode(newRef: HTMLElement | null) {
            const oldRef = this.state.bodyNode;

            if (oldRef === newRef) {
                return;
            }

            this.setState({ bodyNode: newRef });
        }

        _setBodyRef(bodyRef: HTMLElement | null) {
            this.setState({ bodyRef });
        }


        _setOpenedState(evt: Event, opened: boolean) {
            if (this._isControlled()) {
                this.props.onChange?.(evt, opened);

                return;
            }

            if (typeof opened === 'undefined') {
                this.setState((prevState) => {
                    return {
                        opened: !prevState.opened,
                    };
                });

                return;
            }

            this.setState({ opened });
        }

        _setTriggerNode(newRef: HTMLElement | null) {
            const oldRef = this.state.triggerNode;

            if (oldRef === newRef) {
                return;
            }

            if (oldRef) {
                const oldWindow = oldRef.ownerDocument.defaultView;

                oldWindow?.removeEventListener('click', this._onActionOutside);
                oldWindow?.removeEventListener('click', this._onClickDelegated);
            }

            if (newRef) {
                const newWindow = newRef.ownerDocument.defaultView;

                newWindow?.addEventListener('click', this._onActionOutside);
                newWindow?.addEventListener('click', this._onClickDelegated);
            }

            this.setState({ triggerNode: newRef });
        }

        _setTriggerRef(triggerRef: HTMLElement | null) {
            this.setState({ triggerRef });
        }

        renderBody() {
            const { children } = this.props;

            const context = {
                opened: this.state.opened,
                setOpenedState: this._setOpenedState,
                setBodyNode: this._setBodyNode,
                triggerNode: this.state.triggerNode,
                triggerRef: this.state.triggerRef
            };

            return (
                <PopoverBodyContext.Provider value={context}>
                    <ReferenceCurrentRef refSetter={this._setBodyRef}>
                        {cloneElement(children[1], {
                            ref: children[1].ref || this._fallbackBodyRef,
                        })}
                    </ReferenceCurrentRef>
                </PopoverBodyContext.Provider>
            );
        }

        renderTrigger() {
            const { children } = this.props;

            const isControlled = this._isControlled();

            const context = {
                controlled: isControlled,
                opened: this.state.opened,
                setTriggerNode: this._setTriggerNode,
            };

            return (
                <PopoverTriggerContext.Provider value={context}>
                    <ReferenceCurrentRef refSetter={this._setTriggerRef}>
                        {cloneElement(children[0], {
                            ref: children[0].ref || this._fallbackTriggerRef,
                        })}
                    </ReferenceCurrentRef>
                </PopoverTriggerContext.Provider>
            );
        }

        render() {
            return (
                <>
                    {this.renderTrigger()}
                    {this.renderBody()}
                </>
            );
        }

}
