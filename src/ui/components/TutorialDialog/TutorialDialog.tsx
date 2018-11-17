import Dialog from "material-ui/Dialog";
import FlatButton from "material-ui/FlatButton";
import React = require("react");
import TokenBox from '../Shared/TokenBox/TokenBox';
import NavigationClose from "material-ui/svg-icons/navigation/close";
import NavigationArrowBack from "material-ui/svg-icons/navigation/arrow-back";
import IconButton from "material-ui/IconButton";
import './TutorialDialog.scss';

type Props = {
    open: boolean,
    appModel: object,
    viewModel: object,
    closeClicked: () => void,
};

type State = {
    items: Array<{title: string, body: any, imageUrl: string  }>
    currItem: number,
    nextReady: boolean,
 };

const pathwayExample = [{value: "gene", quoted: false},
{value: "in pathway", quoted: false},
{value: "p53 signaling pathway", quoted: true}]

const enhancerExample = [{value: "enhancers", quoted: false},
{value: "in", quoted: false},
{value: "K562", quoted: true},
{value: "within", quoted: false},
{value: "50kbp of", quoted: false},
{value: "gene", quoted: false},
{value: "in pathway", quoted: false},
{value: "Ras signaling pathway", quoted: true}];

const eqtlExample = [{value: "variants", quoted: false},
{value: "influencing", quoted: false},
{value: "gene", quoted: false},
{value: "named", quoted: false},
{value: "PCSK9", quoted: true}];


export default class TutorialDialog extends React.Component<Props, State> {

    constructor(props: Props, ctx?: any) {
        super(props, ctx);

        this.state = {
            items: [],
            currItem: 0,
            nextReady: false,
        }
    }

    componentDidMount() {
        const tutorialItems = [
            {
                title: 'Search the genome',
                body: (<div>
                    <div>Query relationships across disparate genomic datasets such as ENCODE, ExAC, Roadmap, and GTEx.</div>
                    <TokenBox key={'1'} onFinishDemo={this.nextReady} demo={enhancerExample} appModel={this.props.appModel} demoMode={true} viewModel={this.props.viewModel}/>
                </div>),
                imageUrl: '',
            },
            {
                title: 'Searching for variants',
                body: (<div>
                    <div>Use the variants keyword to find variants influencing gene expression (eQTLs) or traits.</div>
                    <TokenBox key={'2'} onFinishDemo={this.nextReady} demo={eqtlExample} appModel={this.props.appModel} demoMode={true} viewModel={this.props.viewModel}/>
                </div>),
                imageUrl: '',
            },
            {
                title: 'Searching for genes',
                body: (<div>
                    <div>Use the genes keyword to find genes or sets of genes.</div>
                    <TokenBox key={'3'} onFinishDemo={this.nextReady} demo={pathwayExample} appModel={this.props.appModel} demoMode={true} viewModel={this.props.viewModel}/>
                </div>),
                imageUrl: '',
            },
        ]
        this.setState({
            items: tutorialItems,
        })
    }

    nextReady = () => {
        this.setState({
            nextReady: true,
        });
    }
    next = () => {
        if (this.state.currItem === this.state.items.length - 1) {
            this.props.closeClicked();
            return;
        }
        this.setState({
            currItem : this.state.currItem +  1,
            nextReady: false,
        })
    }

    previous = () => {
        this.setState({
            currItem : this.state.currItem -  1,
            nextReady: false,
        })
    }

    render() {
        let shareLinkTextareaRef: HTMLTextAreaElement;
        const item = this.state.items[this.state.currItem];
        if (!item) return <div/>;
        const currTitle = (<div>
            {this.state.items[this.state.currItem].title}
            <IconButton style={{position: 'absolute', right: 0, top: 0}} onClick={this.props.closeClicked}>
                <NavigationClose />
            </IconButton>
        </div>);
        const actions = [
            <FlatButton
                className={this.state.nextReady ? "glow" : null}
                label={ this.state.currItem === this.state.items.length - 1 ? "Finish" : "Next example"}
                primary={true}
                onClick={this.next}
            />,
        ];

        return (<Dialog
            className='tutorial-dialog'
            title={currTitle}
            modal={false}
            open={this.props.open}
            onRequestClose={this.props.closeClicked}
            autoScrollBodyContent={true}
            actions={actions}
        >

            <div style={{padding: 24}}>{item.body}</div>
            <img style={{maxWidth: 400}} src={item.imageUrl}/>
        </Dialog>);
    }

}