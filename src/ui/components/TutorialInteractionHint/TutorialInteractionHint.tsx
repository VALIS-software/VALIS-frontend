import * as React from "react";
import { List, ListItem } from "material-ui/List";
import Subheader from "material-ui/Subheader";
import IconButton from "material-ui/IconButton";
import NavigationClose from "material-ui/svg-icons/navigation/close";
import SvgIcon from "material-ui/SvgIcon";

type Props = {
    onRequestClose: () => void,
    show: boolean,
    style?: React.CSSProperties,
}

type State = {
    contentInDOM: boolean,
}

export default class TutorialInteractionHint extends React.Component<Props, State> {

    constructor(props: Props, ctx?: any) {
        super(props, ctx);
        this.state = {
            contentInDOM: props.show,
        };
    }

    componentDidUpdate() {
        if (this.props.show && !this.state.contentInDOM) {
            this.setState({
                contentInDOM: true,
            });
        }
    }

    protected onTransitionEnd = () => {
        if (!this.props.show && this.state.contentInDOM) {
            this.setState({
                contentInDOM: false,
            });
        }
    }

    render() {
            return (
                <div
                    style={{
                        opacity: this.props.show ? 1 : 0,
                        willChange: 'opacity',
                        transition: 'opacity 0.5s',
                        ...this.props.style,
                    }}

                    onTransitionEnd={this.onTransitionEnd}
                >
                    {
                        !this.state.contentInDOM ? null : (
                            <List
                                style={{
                                    background: 'white',
                                    userSelect: 'none',
                                    borderRadius: 3,
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

}