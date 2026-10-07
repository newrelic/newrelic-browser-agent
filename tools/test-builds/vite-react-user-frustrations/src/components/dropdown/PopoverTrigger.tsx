import { cloneElement, useContext, useRef } from 'react';

import { PopoverTriggerContext } from './popover-context';
import ReferenceCurrentRef from './ReferenceCurrentRef';
import ReferenceElement from './ReferenceElement';

type Prop = {
    children: any;
}

function renderTrigger(children: any, fallbackRef: any, triggerProps: any) {
    if (
        typeof children === 'string' ||
        typeof children === 'number' ||
        typeof children === 'boolean'
    ) {
        return <div ref={fallbackRef}>{children}</div>;
    }

    if (typeof children === 'function') {
        const triggerElement = children(triggerProps);

        return cloneElement(triggerElement, {
            ref: triggerElement.ref || fallbackRef,
        });
    }

    return cloneElement(children, {
        ref: children.ref || fallbackRef,
    });
}

/**
 * Child element of the `<Popover>` component.
 *
 * Controls the opening/closing of the Popover overlay.
 */
export default function PopoverTrigger({ children }: Prop) {
    const context = useContext(PopoverTriggerContext) as any;
    const fallbackRef = useRef(null);
    const nodeRef = useRef(null);

    return (
        <ReferenceElement refSetter={context.setTriggerNode} nodeRef={nodeRef}>
            <ReferenceCurrentRef nodeRef={nodeRef} refSetter={() => {}}>
                {renderTrigger(children, fallbackRef, { opened: context.opened, controlled: context.controlled })}
            </ReferenceCurrentRef>
        </ReferenceElement>
    );
}
