import * as React from "react";
import { List, ListItem } from "material-ui/List";
import Subheader from "material-ui/Subheader";
import IconButton from "material-ui/IconButton";
import NavigationClose from "material-ui/svg-icons/navigation/close";
import SvgIcon from "material-ui/SvgIcon";

type Props = {
    onRequestClose: () => void,
    show: boolean,
}

type State = {
    contentInDOM: boolean,
}

export default class TutorialInteractionHint extends React.Component<Props, State> {

    protected containerRef: HTMLDivElement;

    constructor(props: Props, ctx?: any) {
        super(props, ctx);
        this.state = {
            contentInDOM: props.show,
        };
    }

    componentDidMount() {
        console.log('hint componentDidMount', this.containerRef);
    }

    componentWillUnmount() {
        console.log('hint componentWillUnmount', this.containerRef);
    }

    componentDidUpdate(prevProps: Props, prevState: State, snapshot: any) {
        console.log('hint componentDidUpdate', this.props, prevProps, prevState);

        if (this.props.show) {

            if (!this.state.contentInDOM) {
                console.log('add to DOM');
                this.setState({
                    contentInDOM: true,
                });
            }
        }
    }

    render() {
        console.log('hint render');
            return (
                <div
                    ref={(r) => {
                        this.containerRef = r
                    }}
                    style={{
                        position: 'absolute',
                        top: 300,
                        left: 300,
                        zIndex: 100,
                        opacity: this.props.show ? 1 : 0,
                        transition: 'opacity 0.5s',
                    }}
                    onTransitionEnd={this.onTransitionEnd}
                >
                    {
                        !this.state.contentInDOM ? null : (
                            <List
                                style={{
                                    position: 'relative',
                                    background: 'white',
                                    userSelect: 'none',
                                    borderRadius: 3,
                                    zIndex: 102,
                                    boxShadow: '0px 3px 15px 3px #000000ab'
                                }}
                            >
                                <Subheader>
                                    Instructions
                            <IconButton
                                        style={{
                                            position: 'absolute',
                                            right: 0,
                                        }}
                                        onClick={this.props.onRequestClose}
                                    >
                                        <NavigationClose />
                                    </IconButton>
                                </Subheader>
                                <ListItem primaryText="Scroll and drag to navigate" leftIcon={<SvgIcon dangerouslySetInnerHTML={{ __html: require('./mouse-icon.svg') }} />} disabled />
                                <ListItem primaryText="Hold shift and drag to zoom to a region" leftIcon={<SvgIcon dangerouslySetInnerHTML={{ __html: require('./shift-icon.svg') }} />} disabled />
                            </List>
                        )
                    }
                    
                </div>
            );
    }

    protected onTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
        console.log('onTransitionEnd', e);
        if (!this.props.show && this.state.contentInDOM) {
            console.log('remove from DOM');
            this.setState({
                contentInDOM: false,
            });
        }
    }

}