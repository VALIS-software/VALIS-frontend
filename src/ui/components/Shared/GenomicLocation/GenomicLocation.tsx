import * as React from 'react';
import './GenomicLocation.scss';
import { App } from '../../../../App';

type Props = {
  contig: string,
  start: number,
  end: number,
}

class GenomicLocation extends React.Component<Props> {

  constructor(props: Props) {
    super(props);
  }

  render() {
    const contig = this.props.contig;
    const start = this.props.start;
    const end = this.props.end;
    if (start === end) {
      return (<span className="genomic-location" onClick={this.onClick}><span className="contig">{contig}</span><span className="range">{start}</span></span>);
    } else {
      return (<span className="genomic-location" onClick={this.onClick}><span className="contig">{contig}</span><span className="range">{start}:{end}</span></span>);
    }
  }

  onClick = () => {
    App.displayRegion(this.props.contig, this.props.start, this.props.end);
  }

}

export default GenomicLocation;