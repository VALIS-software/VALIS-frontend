import * as React from "react";
import SelectField from "material-ui/SelectField";
import MenuItem from "material-ui/MenuItem";
import RaisedButton from "material-ui/RaisedButton";

import App from "../../../App";
import Strand from "genomics-formats/lib/gff3/Strand";

type Props = {};
type State = {
    strand: Strand,
};

/**
 * Minimal gene annotation filter selector
 *
 * Currently only allows selecting strand, once we have more complex gene annotation queries we can add more options
 */
export default class GeneAnnotationSelector extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            strand: Strand.Positive
        };
    }

    render() {
        return (<div className="track-editor">
            <SelectField
                value={this.state.strand}
                floatingLabelText="Strand"
                onChange={this.onStrandChanged}
                maxHeight={200}
            >
                <MenuItem value={Strand.Positive} primaryText={'Forward Strand →'} />
                <MenuItem value={Strand.Negative} primaryText={'Reverse Strand ←'} />
            </SelectField>
            <RaisedButton
                label="Add Track"
                primary={true}
                onClick={this.onAddTrack}
                style={{ width: '95%' }}
            />
        </div>);
    }

    onStrandChanged = (e: any, i: number, value: any) => {
        this.setState({ strand: value });
    }

    onAddTrack = () => {
        if (this.state.strand === Strand.Positive) {
            App.addTrack({ name: '→ Strand Genes', type: 'annotation', strand: Strand.Positive })
        } else {
            App.addTrack({ name: '← Strand Genes', type: 'annotation', strand: Strand.Negative })
        }
    }

}