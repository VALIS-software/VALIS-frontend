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
    const totalRange = (1.0 + padding) * (end - start);
    const finalStart = (start + end - totalRange) / 2.0;
    const finalEnd = (start + end + totalRange) / 2.0;
    App.displayRegion(this.props.contig, finalStart, finalEnd);
  }

  render() {
    // material-ui doesn't setup the cursor styles properly, so we override:
    return (<IconButton  onClick={this.zoom}><ZoomIn color='white'/></IconButton>);
  }
}

export default ZoomToButton;
