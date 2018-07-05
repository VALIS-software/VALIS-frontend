import * as React from 'react';
import * as PropTypes from 'prop-types';
import './Pills.scss';

class Pills extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const pills = this.props.items;
        const style = this.props.style;
        if (!pills) return (<div />);
        const pillElems = pills.map(item => {
            return (<span style={style} className="pill">{item}</span>)
        })
        return (<span className="pills-container">
            {pillElems}
        </span>);
    }
}

Pills.propTypes = {
    items: PropTypes.array,
};

export default Pills;
