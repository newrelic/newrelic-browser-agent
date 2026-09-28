import { cloneElement, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import ReferenceCurrentRef from "./ReferenceCurrentRef";
import { PopoverBodyContext, PopoverTriggerContext } from "./popover-context";
import type { PopoverBodyHandle } from "./PopoverBody";

type Props = {
    children: any;
    onChange?: (evt: Event, opened: boolean) => void;
    opened?: boolean;
};

export default function Popover({ children, onChange, opened: openedProp }: Props) {
    const isControlled = typeof openedProp === 'boolean';

    const [internalOpened, setInternalOpened] = useState(false);
    const opened = isControlled ? !!openedProp : internalOpened;

    const [triggerNode, setTriggerNodeState] = useState<HTMLElement | null>(null);
    const [triggerRef, setTriggerRef] = useState<HTMLElement | null>(null);
    const [bodyNode, setBodyNode] = useState<HTMLElement | null>(null);
    const [bodyRef, setBodyRef] = useState<PopoverBodyHandle | null>(null);

    const fallbackBodyRef = useRef(null);
    const fallbackTriggerRef = useRef(null);
    const triggerNodeRef = useRef<HTMLElement | null>(null);

    // Mirrors the class version's `this.state`/`this.props` always being fresh:
    // the stable handler functions below read through this ref instead of
    // closing over the values from the render that created them.
    const latestRef = useRef({ opened, triggerNode, bodyNode, bodyRef, isControlled, onChange });
    latestRef.current = { opened, triggerNode, bodyNode, bodyRef, isControlled, onChange };

    const setOpenedState = useRef((evt: Event, nextOpened?: boolean) => {
        const { isControlled: currentControlled, onChange: currentOnChange } = latestRef.current;

        if (currentControlled) {
            currentOnChange?.(evt, nextOpened as boolean);

            return;
        }

        if (typeof nextOpened === 'undefined') {
            setInternalOpened((prev) => !prev);

            return;
        }

        setInternalOpened(nextOpened);
    }).current;

    const onClick = useRef((evt: Event) => {
        const { bodyRef: currentBodyRef, opened: currentOpened, isControlled: currentControlled, onChange: currentOnChange } = latestRef.current;

        if (!evt.defaultPrevented) {
            if (currentControlled) {
                currentOnChange?.(evt, !currentOpened);
            } else {
                currentBodyRef?.toggle(evt as unknown as MouseEvent, !currentOpened);
            }
        }
    }).current;

    const onClickDelegated = useRef((evt: Event) => {
        const { triggerNode: currentTriggerNode } = latestRef.current;

        if (currentTriggerNode && currentTriggerNode.contains(evt.target as HTMLElement)) {
            return onClick(evt);
        }
    }).current;

    const onActionOutside = useRef((evt: Event) => {
        const {
            opened: currentOpened,
            triggerNode: currentTriggerNode,
            bodyNode: currentBodyNode,
            isControlled: currentControlled,
            onChange: currentOnChange,
            bodyRef: currentBodyRef,
        } = latestRef.current;

        if (!currentOpened) {
            return;
        }

        for (let node: ParentNode | null = evt.target as ParentNode; node; node = node.parentNode) {
            if (node === currentTriggerNode || node === currentBodyNode) {
                return;
            }
        }

        if (currentControlled) {
            currentOnChange?.(evt, false);
        } else {
            currentBodyRef?.close(evt as unknown as MouseEvent);
        }
    }).current;

    const setTriggerNode = useRef((newRef: HTMLElement | null) => {
        const oldRef = triggerNodeRef.current;

        if (oldRef === newRef) {
            return;
        }

        if (oldRef) {
            const oldWindow = oldRef.ownerDocument.defaultView;

            oldWindow?.removeEventListener('click', onActionOutside);
            oldWindow?.removeEventListener('click', onClickDelegated);
        }

        if (newRef) {
            const newWindow = newRef.ownerDocument.defaultView;

            newWindow?.addEventListener('click', onActionOutside);
            newWindow?.addEventListener('click', onClickDelegated);
        }

        triggerNodeRef.current = newRef;
        setTriggerNodeState(newRef);
    }).current;

    // Clean up properly so there aren't any event handler leaks.
    useEffect(() => {
        return () => {
            const oldRef = triggerNodeRef.current;

            if (oldRef) {
                const oldWindow = oldRef.ownerDocument.defaultView;

                oldWindow?.removeEventListener('click', onActionOutside);
                oldWindow?.removeEventListener('click', onClickDelegated);
            }
        };
    }, [onActionOutside, onClickDelegated]);

    const triggerContextValue = useMemo(() => ({
        controlled: isControlled,
        opened,
        setTriggerNode,
    }), [isControlled, opened, setTriggerNode]);

    const bodyContextValue = useMemo(() => ({
        opened,
        setOpenedState,
        setBodyNode,
        triggerNode,
        triggerRef,
    }), [opened, setOpenedState, setBodyNode, triggerNode, triggerRef]);

    return (
        <>
            <PopoverTriggerContext.Provider value={triggerContextValue}>
                <ReferenceCurrentRef refSetter={setTriggerRef}>
                    {cloneElement(children[0], {
                        ref: children[0].ref || fallbackTriggerRef,
                    })}
                </ReferenceCurrentRef>
            </PopoverTriggerContext.Provider>
            <PopoverBodyContext.Provider value={bodyContextValue}>
                <ReferenceCurrentRef refSetter={setBodyRef}>
                    {cloneElement(children[1], {
                        ref: children[1].ref || fallbackBodyRef,
                    })}
                </ReferenceCurrentRef>
            </PopoverBodyContext.Provider>
        </>
    );
}
