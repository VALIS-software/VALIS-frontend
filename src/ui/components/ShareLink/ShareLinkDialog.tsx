import { Dialog, FlatButton, Snackbar } from "material-ui";
import React = require("react");

type Props = { shareLink: string, open: boolean, handleClose: () => void };
type State = { clipboardNotificationText: null | string };

export default class ShareLinkDialog extends React.Component<Props, State> {

    constructor(props: Props, ctx?: any) {
        super(props, ctx);
        this.state = {
            clipboardNotificationText: null
        }
    }

    render() {
        let shareLinkTextareaRef: HTMLTextAreaElement;

        return (<Dialog
            title="Sharing Link"
            modal={false}
            open={this.props.open}
            onRequestClose={this.props.handleClose}
            autoScrollBodyContent={true}
            actions={[
                <FlatButton
                    label="Copy to Clipboard"
                    primary={false}
                    onClick={() => {
                        shareLinkTextareaRef.focus();
                        shareLinkTextareaRef.select();
                        if (document.execCommand('copy')) {
                            this.setState({
                                clipboardNotificationText: 'Copied!'
                            });
                        } else {
                            this.setState({
                                clipboardNotificationText: 'Error copying to clipboard'
                            });
                        }
                    }}
                />,
                <FlatButton
                    label="Close"
                    primary={true}
                    onClick={this.props.handleClose}
                />
            ]}
            contentStyle={{ overflow: 'hidden' }}
        >
            <textarea
                ref={(v) => shareLinkTextareaRef = v}
                style={{ width: '100%', fontSize: '1.0em' }}
                onClick={(e) => {
                    if (e.target instanceof HTMLTextAreaElement) {
                        let textarea = e.target;
                        textarea.select();
                    }
                }}
                value={this.props.shareLink}
                readOnly={true}
            />
            <Snackbar
                open={(this.state.clipboardNotificationText != null)}
                autoHideDuration={1000}
                message={this.state.clipboardNotificationText || ''}
                onRequestClose={(r) => {
                    this.setState({
                        clipboardNotificationText: null
                    });
                }}
            />
        </Dialog>)
    }

}