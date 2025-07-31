import { PureComponent } from 'react';
import { findDOMNode } from 'react-dom';

type Prop = {
    children: any;
    refSetter: (node: Element | Text | null) => void;
};

type State = {
    refNode: Element | Text | null;
}

export default class ReferenceElement extends PureComponent<Prop, State> {
    static defaultProps = {};
    events: Map<any, any>;

    constructor(props: Prop) {
        super(props);

        this._addEventListeners = this._addEventListeners.bind(this);
        this.events = new Map();

        this.state = {
            refNode: null,
        };
    }

    componentDidMount() {
        this._setRefNode(findDOMNode(this));
    }

    componentDidUpdate() {
        this._setRefNode(findDOMNode(this));
    }

    componentWillUnmount() {
        this._removeEventListeners();
    }

    _addEventListeners() {
        const { refNode } = this.state;

        if (!refNode) {
            return;
        }

        for (const propName of Object.keys(this.props)) {
            if (propName.startsWith('on')) {
                const eventName = propName.replace(/^on/, '').toLowerCase();

                const handler = this._onEvent.bind(this, propName);

                this.events.set(eventName, handler);

                refNode.addEventListener(eventName, handler);
            }
        }
    }

    _onEvent(propName: any, evt: Event) {
        // @ts-ignore
      const prop = this.props[propName];

        prop && prop(evt);
    }

    _removeEventListeners() {
        const { refNode } = this.state;

        if (!refNode) {
            return;
        }

        for (const [eventName, handler] of this.events) {
            refNode.removeEventListener(eventName, handler);
        }

        this.events.clear();
    }

    /* eslint-disable-next-line react/no-find-dom-node */
    _setRefNode(node: any) {
        if (node !== this.state.refNode) {
            this._removeEventListeners();
            this.setState({ refNode: node }, this._addEventListeners);
        }

        this.props.refSetter(node);
    }

    render() {
        const { children } = this.props;

        if ((typeof children === 'string' && children.length) || typeof children === 'number') {
            return <span>{children}</span>;
        }

        return children;
    }
}
