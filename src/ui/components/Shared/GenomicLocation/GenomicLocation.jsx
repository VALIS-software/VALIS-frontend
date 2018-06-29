import * as React from 'react';
import * as PropTypes from 'prop-types';
import './GenomicLocation.scss';

function CopyableText(props) {
  const style = {
    border: 'none',
  };
  return (<input style={style} className="copyable" type="text" readOnly={true} value={props.text} />);
}

CopyableText.propTypes = {
  text: PropTypes.string,
};

class GenomicLocation extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let locText = '';
    if (this.props.start === this.props.end) {
      locText = `${this.props.contig}:${this.props.start}`;
    } else {
      locText = `${this.props.contig}:${this.props.start}-${this.props.end}`;
    }
    return (<div className="genomic-location"><CopyableText text={locText} /></div>);
  }
}

GenomicLocation.propTypes = {
  contig: PropTypes.string,
  start: PropTypes.number,
  end: PropTypes.number,
};

export default GenomicLocation;
