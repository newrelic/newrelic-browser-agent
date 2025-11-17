
import { PureComponent } from 'react';

type Prop = {
    children: any;
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
        const { children } = this.props;
        const ref = children.ref && children.ref.current;

        this.props.refSetter(ref);
    }

    render() {
        return this.props.children;
    }
}
