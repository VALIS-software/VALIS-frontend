import * as React from 'react';
import * as PropTypes from 'prop-types';
import './GenomicLocation.scss';

class GenomicLocation extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const contig = this.props.contig;
    const start = this.props.start;
    const end = this.props.end;
    if (start === end) {
      return (<span className="genomic-location"><span className="contig">{contig}</span><span className="range">{start}</span></span>);
    } else {
      return (<span className="genomic-location"><span className="contig">{contig}</span><span className="range">{start}:{end}</span></span>);
    }
  }
}

GenomicLocation.propTypes = {
  contig: PropTypes.string,
  start: PropTypes.number,
  end: PropTypes.number,
};

export default GenomicLocation;
