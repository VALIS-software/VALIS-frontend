import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './TutorialIndicator.scss';


type FilterValuePromise = Promise<void> | undefined;

type State = {
    offsetX: number,
    offsetY: number,
}

type Props = {
    tutorialId: string,
}

class TutorialIndicator extends React.Component<Props, State> {
    
    constructor(props: Props) {
        super(props);
        this.state = {
            offsetX: 0,
            offsetY: 0,
        };
    }

    showAlert = () => {
        alert('clicked tutorial button');
    }

    componentDidMount() {
        //measure parent dom elem size:
        const parent = ReactDOM.findDOMNode(this).parentNode as Element;
        
        // offset elem 
        const height = parent.clientHeight;
        const width = parent.clientWidth;
        this.setState({
            offsetX: width,
            offsetY: height,
        })
    }

    render() {

        return (<div onClick={this.showAlert} className='tutorial-indicator'><div className='glow-wrapper' style={{width: this.state.offsetX, height: this.state.offsetY, paddingTop: this.state.offsetY/2}}><div className='glow'/></div></div>);
    }
}

export default TutorialIndicator;
