import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { createPortal } from 'react-dom';
import { autoUpdate, flip, offset, shift, useFloating, type Placement } from '@floating-ui/react';

import ReferenceElement from './ReferenceElement';

import { PopoverBodyContext, PopoverListContext } from './popover-context';

const PLACEMENT_TYPE = {
    TOP_START: 'top-start',
    TOP_END: 'top-end',
    BOTTOM_START: 'bottom-start',
    BOTTOM_END: 'bottom-end',
    RIGHT_START: 'right-start',
    RIGHT_END: 'right-end',
    LEFT_START: 'left-start',
    LEFT_END: 'left-end',
};
const DEFAULT_PLACEMENT = PLACEMENT_TYPE.BOTTOM_START;

type Prop = {
    children: any;
    className?: string;
    onClose?: (event: React.MouseEvent) => void;
    onOpen?: (event: React.MouseEvent) => void;
    onToggle?: (event: React.MouseEvent, opened: boolean) => void;
    placementType?: string;
    style?: React.CSSProperties;
}

export type PopoverBodyHandle = {
    open: (event: React.MouseEvent) => void;
    close: (event: React.MouseEvent) => void;
    toggle: (event: React.MouseEvent, opened: boolean) => void;
};

function isOverflownHorizontal(element: HTMLElement) {
    return element.scrollWidth > element.clientWidth;
}

function isOverflownVertical(element: HTMLElement) {
    return element.scrollHeight > element.clientHeight;
}

export function getScrollParent(base: HTMLElement, boundaryElement: HTMLElement) {
    let node: HTMLElement | null = null;

    if (base) {
        const { defaultView, body } = base.ownerDocument;

        for (
            node = base;
            node && node !== boundaryElement && node !== body;
            node = node.parentNode as HTMLElement
        ) {
            if (node.nodeType !== Node.ELEMENT_NODE) {
                continue;
            }

            // Partially extracted and adapted from PopperJS internal logic
            // ("getScrollParent" method).
          if (defaultView) {
            const {overflow, overflowX, overflowY} = defaultView.getComputedStyle(node);
            const all = overflow + overflowY + overflowX;

            if (
              node.hasAttribute('data-boundary-container') ||
              // If scroll is forced, use this node.
              /(?:scroll|overlay)/.test(all) ||
              // If scroll is "auto", ensure it's really scrolling before using it.
              (/auto/.test(all) && (isOverflownHorizontal(node) || isOverflownVertical(node)))
            ) {
              break;
            }
          }
        }
    }

    return node || boundaryElement;
}

type FloatingBodyProps = {
    referenceElement: HTMLElement;
    boundaryElement: HTMLElement;
    allowEscape: boolean;
    placement: Placement;
    children: (bag: { ref: (node: HTMLElement | null) => void; style: React.CSSProperties }) => React.ReactElement | null;
};

/**
 * Positions the Popover body relative to `referenceElement` (the trigger),
 * replacing the old `react-popper` `<Popper>` render-prop component with
 * `@floating-ui/react`'s `useFloating()` hook.
 */
function FloatingBody({ referenceElement, boundaryElement, allowEscape, placement, children }: FloatingBodyProps) {
    const { refs, floatingStyles } = useFloating({
        elements: { reference: referenceElement },
        placement,
        whileElementsMounted: autoUpdate,
        middleware: allowEscape
            ? [offset({ mainAxis: 6 })]
            : [
                offset({ mainAxis: 6 }),
                flip({ boundary: boundaryElement }),
                shift({ boundary: boundaryElement }),
            ],
    });

    return children({ ref: refs.setFloating, style: floatingStyles });
}

/**
 * @nr1-docs
 *
 * Child element of the `<Popover>` component.
 *
 * Contains the content of the Popover overlay.
 */
const PopoverBody = forwardRef<PopoverBodyHandle, Prop>(function PopoverBody(props, ref) {
    // Mirrors the class version reading `this.props`/`this.state` fresh on every
    // call: the imperative handle and event listeners below are created once
    // and read the latest props/callback through these refs instead of closing
    // over values from the render that created them.
    const propsRef = useRef(props);
    propsRef.current = props;

    const setOpenedStateRef = useRef<((event: React.MouseEvent, opened: boolean) => void) | null>(null);
    const nodeRef = useRef<HTMLElement | null>(null);
    const setFloatingRef = useRef<((node: HTMLElement | null) => void) | null>(null);

    const handleRef = useRef<PopoverBodyHandle>({
        open(event) {
            const { onOpen, onToggle } = propsRef.current;

            setOpenedStateRef.current?.(event, true);
            onOpen?.(event);
            onToggle?.(event, true);
        },
        close(event) {
            const { onClose, onToggle } = propsRef.current;

            setOpenedStateRef.current?.(event, false);
            onClose?.(event);
            onToggle?.(event, false);
        },
        toggle(event, opened) {
            const { onClose, onOpen, onToggle } = propsRef.current;

            setOpenedStateRef.current?.(event, opened);

            if (opened) {
                onOpen?.(event);
            } else {
                onClose?.(event);
            }

            onToggle?.(event, opened);
        },
    });

    useImperativeHandle(ref, () => handleRef.current, []);

    // Stable identity across renders: `refs.setFloating` from useFloating()
    // changes on every FloatingBody re-render if wrapped inline in JSX, which
    // makes React detach/reattach the ref each time and re-triggers floating-ui's
    // position calculation in a loop. Store the latest setter and expose one
    // unchanging callback instead.
    const mergedRef = useRef((node: HTMLElement | null) => {
        setFloatingRef.current?.(node);
        nodeRef.current = node;
    }).current;

    function getStyle(popoverBodyStyle: any) {
        return {
            ...popoverBodyStyle,
            ...propsRef.current.style,
        };
    }

    return (
        <PopoverBodyContext.Consumer>
            {(contextValue) => {
                const {
                    opened,
                    triggerNode,
                    setBodyNode,
                    triggerRef,
                    setOpenedState,
                } = contextValue as {
                    opened: any;
                    triggerNode: any;
                    setBodyNode: any;
                    triggerRef: any;
                    setOpenedState: any;
                };

                setOpenedStateRef.current = setOpenedState;

                if (!triggerNode) {
                    return null;
                }

                const boundaryElement = getScrollParent(triggerNode, triggerNode.ownerDocument.body);

                return createPortal(
                    <FloatingBody
                        referenceElement={triggerNode}
                        boundaryElement={boundaryElement}
                        allowEscape={false}
                        placement={DEFAULT_PLACEMENT as Placement}
                    >
                        {({ ref: floatingRef, style }) => {
                            setFloatingRef.current = floatingRef;

                            if (!opened) {
                                return null;
                            }

                            const listContext = {
                                triggerRef,
                                triggerNode,
                                bodyRef: handleRef.current,
                            };

                            return (
                                <ReferenceElement refSetter={setBodyNode} nodeRef={nodeRef}>
                                    <div
                                        ref={mergedRef}
                                        style={getStyle(style)}
                                    >
                                        <div>
                                            <PopoverListContext.Provider value={listContext}>
                                                {propsRef.current.children}
                                            </PopoverListContext.Provider>
                                        </div>
                                    </div>
                                </ReferenceElement>
                            );
                        }}
                    </FloatingBody>,

                    triggerNode.ownerDocument.body
                );
            }}
        </PopoverBodyContext.Consumer>
    );
});

PopoverBody.displayName = 'PopoverBody';

export default PopoverBody;
