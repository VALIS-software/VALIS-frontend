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
            // an item is fully identified by the item string
            // if more data is added to item, be sure to update the key to include it
            let key = item;
            return (<span style={style} className="pill" key={key}>{item}</span>)
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
