import * as React from 'react';
import Paper from 'material-ui/Paper';
import './TutorialIndicator.scss';


type Props = {
    message?: string,
    visible?: boolean,
}

type State = {

}

class TutorialIndicator extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
    }

    render() {
        const style : React.CSSProperties = {
            position: 'absolute',
            backgroundColor: 'white',
            bottom: 0,
            left: 0,
            borderRadius: 8,
            height: 'auto',
            width: 400,
            margin: 20,
            textAlign: 'left',
            display: 'inline-block',
            opacity: this.props.visible ? 1.0 : 0.0,
            transition: 'opacity .5s ease-in-out',
        };

        return (<Paper className='tutorial-indicator' style={style} zDepth={1}><div style={{padding: 16}}>{this.props.message}</div></Paper>);
    }
}

export default TutorialIndicator;
