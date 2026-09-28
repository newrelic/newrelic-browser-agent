import { useEffect, useRef, useState, type RefObject } from 'react';

type Prop = {
    children: any;
    nodeRef: RefObject<Element | Text | null>;
    refSetter: (node: Element | Text | null) => void;
    [handlerProp: string]: any;
};

export default function ReferenceElement({ children, nodeRef, refSetter, ...handlers }: Prop) {
    const [refNode, setRefNode] = useState<Element | Text | null>(null);
    const handlersRef = useRef(handlers);

    handlersRef.current = handlers;

    // Runs after every render (mount and update), same as the class version's
    // componentDidMount/componentDidUpdate pair, since nodeRef.current can
    // change without a prop change triggering a re-render.
    useEffect(() => {
        const node = nodeRef.current;

        if (node !== refNode) {
            setRefNode(node);
        }

        refSetter(node);
    });

    useEffect(() => {
        if (!refNode) {
            return;
        }

        const listeners: Array<[string, (evt: Event) => void]> = [];

        for (const propName of Object.keys(handlersRef.current)) {
            if (propName.startsWith('on')) {
                const eventName = propName.replace(/^on/, '').toLowerCase();
                // Reads handlersRef.current at call time (not closed over here) so a
                // handler prop swapped in later is still picked up without rebinding.
                const listener = (evt: Event) => handlersRef.current[propName]?.(evt);

                listeners.push([eventName, listener]);
                refNode.addEventListener(eventName, listener);
            }
        }

        return () => {
            for (const [eventName, listener] of listeners) {
                refNode.removeEventListener(eventName, listener);
            }
        };
    }, [refNode]);

    if ((typeof children === 'string' && children.length) || typeof children === 'number') {
        return <span>{children}</span>;
    }

    return children;
}
