import IconButton from 'material-ui/IconButton';
import ZoomIn from 'material-ui/svg-icons/action/zoom-in';
import * as React from 'react';
// Styles
import './ZoomToButton.scss';
import { App } from '../../../../App';

type Props = {
  contig: string,
  start: number,
  end: number,
  padding: number,
}

class ZoomToButton extends React.Component<Props> {

  zoom = () => {
    const { start, end, padding } = this.props;
    const totalRange = Math.max(10000, (1.0 + padding) * (end - start));
    const finalStart = (start + end - totalRange) / 2.0;
    const finalEnd = (start + end + totalRange) / 2.0;
    App.displayRegion(this.props.contig, finalStart, finalEnd);
  }

  render() {
    return (<IconButton><ZoomIn onClick={this.zoom} /></IconButton>);
  }
}

export default ZoomToButton;
