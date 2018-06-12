import * as React from 'react';
import * as PropTypes from 'prop-types';
import './ErrorDetails.scss';

class ErrorDetails extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        if (!this.props.error) return (<div />);
        const errorText = JSON.stringify(this.props.error);
        return (<div className="error-details"><em>Error:</em> {errorText}</div>);
    }
}

ErrorDetails.propTypes = {
    error: PropTypes.object,
};

export default ErrorDetails;
