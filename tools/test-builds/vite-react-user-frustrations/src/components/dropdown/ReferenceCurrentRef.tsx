
import { PureComponent, type RefObject } from 'react';

type Prop = {
    children: any;
    nodeRef?: RefObject<HTMLElement | null>;
    refSetter: (ref: HTMLElement | null) => void;
}
export default class ReferenceCurrentRef extends PureComponent<Prop> {

    static defaultProps = {};

    componentDidMount() {
        this._setRef();
    }

    componentDidUpdate() {
        this._setRef();
    }

    _setRef() {
        const { children, nodeRef } = this.props;
        const ref = children.ref && children.ref.current;

        if (nodeRef) {
            nodeRef.current = ref;
        }

        this.props.refSetter(ref);
    }

    render() {
        return this.props.children;
    }
}
