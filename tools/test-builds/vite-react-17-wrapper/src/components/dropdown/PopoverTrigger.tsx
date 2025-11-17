import React, { cloneElement, createRef, PureComponent } from 'react';

import { PopoverTriggerContext } from './popover-context';
import ReferenceCurrentRef from './ReferenceCurrentRef';
import ReferenceElement from './ReferenceElement';

type Prop = {
    children: any
}
/**
 * Child element of the `<Popover>` component.
 *
 * Controls the opening/closing of the Popover overlay.
 */
export default class PopoverTrigger extends PureComponent<Prop> {
    static defaultProps = {};
    _triggerRef: any;
    _fallbackRef: any;

    constructor(props: Prop) {
        super(props);

        this._triggerRef = null;
        this._fallbackRef = createRef();
    }

    /**
     * Focus the PopoverTrigger children.
     */
    focus() {
        if (typeof this._triggerRef?.focus === 'function') this._triggerRef.focus();
    }

    renderTrigger(triggerProps: any) {
        const { children } = this.props;

        if (
            typeof children === 'string' ||
            typeof children === 'number' ||
            typeof children === 'boolean'
        ) {
            return <div ref={this._fallbackRef}>{children}</div>;
        }

        if (typeof children === 'function') {
            const triggerElement = children(triggerProps);

            return cloneElement(triggerElement, {
                ref: triggerElement.ref || this._fallbackRef,
            });
        }

        return cloneElement(children, {
            ref: children.ref || this._fallbackRef,
        });
    }

    render() {
        return (
            <PopoverTriggerContext.Consumer>
                {(context: any) => (
                    <ReferenceElement refSetter={context.setTriggerNode}>
                        <ReferenceCurrentRef
                            refSetter={(ref: HTMLElement | null) => {
                                this._triggerRef = ref;
                            }}
                        >
                            {this.renderTrigger({ opened: context.opened, controlled: context.controlled })}
                        </ReferenceCurrentRef>
                    </ReferenceElement>
                )}
            </PopoverTriggerContext.Consumer>
        );
    }
}
