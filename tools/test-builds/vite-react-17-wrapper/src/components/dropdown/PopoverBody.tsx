import React, { createRef, PureComponent } from 'react';
import { createPortal } from 'react-dom';
import { Popper } from 'react-popper';

import ReferenceElement from './ReferenceElement';

import { PopoverBodyContext, PopoverListContext } from './popover-context';

const popperModifiers = new WeakMap();

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

/**
 * @nr1-docs
 *
 * Child element of the `<Popover>` component.
 *
 * Contains the content of the Popover overlay.
 */
export default class PopoverBody extends PureComponent<Prop> {
    static PLACEMENT_TYPE = PLACEMENT_TYPE;

    _setOpenedState: ((event: React.MouseEvent, opened: boolean) => void) | null = null;
    _bodyRef: any;

    constructor(props: Prop) {
        super(props);

        this._getStyle = this._getStyle.bind(this);

        this._bodyRef = createRef();

        this.open = this.open.bind(this);
        this.close = this.close.bind(this);
        this.toggle = this.toggle.bind(this);
    }

    /**
     * Closes the Popover body.
     */
    close(event: React.MouseEvent) {
        const { onClose, onToggle } = this.props;

        this._setOpenedState?.(event, false);
        onClose?.(event);
        onToggle?.(event, false);
    }

    /**
     * Opens the Popover body.
     */
    open(event: React.MouseEvent) {
        const { onOpen, onToggle } = this.props;

        this._setOpenedState?.(event, true);
        onOpen?.(event);
        onToggle?.(event, true);
    }

    /**
     * Toggles the Popover body.
     */
    toggle(event: React.MouseEvent, opened: boolean) {
        const { onClose, onOpen, onToggle } = this.props;

        this._setOpenedState?.(event, opened);

        if (opened) {
            onOpen?.(event);
        } else {
            onClose?.(event);
        }

        onToggle?.(event, opened);
    }

    _getPopperModifiers(boundariesElement: any, allowPopperToEscapeBoundary: boolean) {
        const offset = {
            enabled: true,
            offset: `0, 6`,
        };

        if (
            boundariesElement &&
            !popperModifiers.has(boundariesElement) &&
            !allowPopperToEscapeBoundary
        ) {
            const boundaryModifiers = {
                flip: {
                    boundariesElement,
                    flipVariationsByContent: true,
                    order: 250, // Execute before "preventOverflow".
                },

                preventOverflow: {
                    boundariesElement,
                },
            };

            popperModifiers.set(boundariesElement, {
                offset,
                ...boundaryModifiers,
            });
        }

        // Only apply the offset for poppers that can escape, otherwise apply the full set of modifiers (which includes boundary configuration)
        return allowPopperToEscapeBoundary ? { offset } : popperModifiers.get(boundariesElement);
    }

    _getStyle(popoverBodyStyle: any) {
        const { style } = this.props;

        return {
            ...popoverBodyStyle,
            ...style,
        };
    }

    renderBody(portalTargetRef: any, boundaryRef: any) {
        const { children } = this.props;

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

                    this._setOpenedState = setOpenedState;

                    if (!triggerNode) {
                        return null;
                    }

                    const boundaryElement = getScrollParent(
                        triggerNode,
                        boundaryRef || portalTargetRef || triggerNode.ownerDocument.body
                    );

                    return createPortal(
                        <Popper
                            modifiers={this._getPopperModifiers(
                                boundaryElement,
                                false
                            )}
                            placement={DEFAULT_PLACEMENT as any}
                            referenceElement={triggerNode}
                        >
                            {({ ref, style }) => {
                                if (!opened) {
                                    return null;
                                }

                                const context = {
                                    triggerRef,
                                    triggerNode,
                                    bodyRef: this,
                                };

                                return (
                                    <ReferenceElement refSetter={setBodyNode}>
                                        <div
                                            ref={ref}
                                            style={this._getStyle(style)}
                                        >
                                            <div
                                                ref={this._bodyRef}
                                            >
                                                <PopoverListContext.Provider value={context}>
                                                    {children}
                                                </PopoverListContext.Provider>
                                            </div>
                                        </div>
                                    </ReferenceElement>
                                );
                            }}
                        </Popper>,

                        portalTargetRef || triggerNode.ownerDocument.body
                    );
                }}
            </PopoverBodyContext.Consumer>
        );
    }

    render() {
        return (
            this.renderBody(null, null)
        );
    }
}
