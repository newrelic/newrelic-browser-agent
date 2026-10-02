import { useEffect, type RefObject } from 'react';

type Prop = {
    children: any;
    // `children.ref.current` can be a DOM node or, for a forwardRef component
    // exposing an imperative handle (e.g. PopoverBody), the handle object.
    nodeRef?: RefObject<HTMLElement | null>;
    refSetter: (ref: any) => void;
}

export default function ReferenceCurrentRef({ children, nodeRef, refSetter }: Prop) {
    useEffect(() => {
        const ref = children.ref && children.ref.current;

        if (nodeRef) {
            nodeRef.current = ref;
        }

        refSetter(ref);
    });

    return children;
}
