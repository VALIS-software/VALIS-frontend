import * as React from "react";
import { List, ListItem } from "material-ui/List";
import { Subheader } from "material-ui/Subheader";
import { IconButton } from "material-ui/IconButton";
import { NavigationClose } from "material-ui/svg-icons/navigation/close";
import { SvgIcon } from "material-ui/SvgIcon";

type Props = {
}

type State = {
}

export class TutorialInteractionHint extends React.Component<Props, State>  {

    constructor(props: Props, ctx?: any) {
        super(props, ctx);

        this.state = {};
    }

    render() {
        return (
            <div style={{ position: 'absolute', top: 300, left: 300, zIndex: 100 }}>
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
                        >
                            <NavigationClose />
                        </IconButton>
                    </Subheader>
                    <ListItem primaryText="Scroll and drag to navigate" leftIcon={<SvgIcon dangerouslySetInnerHTML={{ __html: require('./mouse-icon.svg') }} />} disabled />
                    <ListItem primaryText="Hold shift and drag to zoom to a region" leftIcon={<SvgIcon dangerouslySetInnerHTML={{ __html: require('./shift-icon.svg') }} />} disabled />
                </List>
            </div>
        );
    }

}