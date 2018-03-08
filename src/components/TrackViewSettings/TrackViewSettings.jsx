// Dependencies

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Util from '../../helpers/util.js';
import InputRange from 'react-input-range';
import { withStyles } from 'material-ui/styles';
import Divider from 'material-ui/Divider';
import AutoComplete from 'material-ui/AutoComplete';
import Toggle from 'material-ui/Toggle';
import { RadioButton, RadioButtonGroup } from 'material-ui/RadioButton';
import { Card, CardHeader, CardTitle, CardText } from 'material-ui/Card';
import { HuePicker } from 'react-color';

// Styles
import './TrackViewSettings.scss';
import 'react-input-range/lib/css/index.css';

class TrackViewSettings extends Component {
  constructor(props) {
    super(props);
    this.onHeightChange = this.onHeightChange.bind(this);
    this.onColorChange = this.onColorChange.bind(this);
    this.onNewRequest = this.onNewRequest.bind(this);
    this.setAutoScale = this.setAutoScale.bind(this);
  }

  componentDidMount() {
    this.setState({
      currentHeight: 0.1,
      currentBasePairOffset: 0,
      currentColor: 0.8,
      dataSource: ['BRCA1', 'SLC6A4'],
    });
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.model || !nextProps.guid) return;
    this.setState({
      currentHeight: nextProps.model.getTrackHeight(nextProps.guid),
      currentColor: nextProps.model.getTrackColor(nextProps.guid),
      yAxisMode: 'a',
    });
  }

  onColorChange(currentColor) {
    const guid = this.props.guid;
    const hue = currentColor.hsv.h / 360.0;
    this.props.model.setTrackColor(guid, hue);
    this.setState({ currentColor: hue });
  }

  onHeightChange(currentHeight) {
    const guid = this.props.guid;
    this.props.model.setTrackHeight(guid, currentHeight);
    this.setState({ currentHeight });
  }

  onNewRequest(chosen, index) {
    const guid = this.props.guid;
    let currentBasePairOffset = 0;
    if (index < 0) {
      const val = parseFloat(chosen);
      if (!isNaN(val)) {
        currentBasePairOffset = val;
      }
    } else if (index === 0) {
        currentBasePairOffset += 41196312.0;
    } else if (index === 1) {
      currentBasePairOffset += 30194319.0;
    }
    this.props.model.setTrackBasePairOffset(guid, currentBasePairOffset);
    this.setState({ currentBasePairOffset });
  }

  setAutoScale(e, v) {
    this.setState({
      autoScale: v,
    });
  }

  render() {
    if (!this.state) return (<div />);
    const onHeightChange = this.onHeightChange;
    const onColorChange = this.onColorChange;
    const dataSourceConfig = {
      // text: 'name',
      // value: 'name',
    };

    let yAxisControls = (<div>
      <div className="vertical-wrapper">Y-Axis range </div>
      <div className="control-wrapper">
        <InputRange
          formatLabel={value => value.toFixed(2)}
          step={0.01}
          maxValue={1}
          minValue={0.1}
          value={this.state.currentHeight}
          onChange={onHeightChange}
        />
      </div>
    </div>);
    if (this.state.autoScale) {
      yAxisControls = (<div>
        <div className="vertical-wrapper">
          <RadioButtonGroup name="shipSpeed" defaultSelected="not_light">
            <RadioButton
              value="light"
              label="Scale to total track range"
            />
            <RadioButton
              value="not_light"
              label="Scale to current display range"
            />
          </RadioButtonGroup>
        </div>
        <div>Zoom </div>
        <div className="control-wrapper">
          <InputRange
            formatLabel={value => value.toFixed(2)}
            step={0.01}
            maxValue={1}
            minValue={0.1}
            value={this.state.currentHeight}
            onChange={onHeightChange}
          />
        </div>
        <div>Offset </div>
        <div className="control-wrapper">
          <InputRange
            formatLabel={value => value.toFixed(2)}
            step={0.01}
            maxValue={1}
            minValue={0.1}
            value={this.state.currentHeight}
            onChange={onHeightChange}
          />
        </div>
      </div>);
    }

    const headerStyle = {
      backgroundColor: '#e8e8e8',
    };

    const color = this.props.guid ? this.props.model.getTrackColor(this.props.guid) : 0.0;
    const hsvColor = { h: 360.0 * color, s: 1.0, l: 1.0 };
    const huePicker = (<HuePicker color={hsvColor} onChangeComplete={onColorChange} width="100%" />);
    return (<div className="track-view-settings">
      <Card>
        <CardHeader style={headerStyle} title="Track Color" />
        <CardText>
          {huePicker}
        </CardText>
      </Card>
      <Card>
        <CardHeader style={headerStyle} title="Track Height" />
        <CardText>
          <div className="control-wrapper">
            <InputRange
              formatLabel={value => value.toFixed(2)}
              step={0.01}
              maxValue={1}
              minValue={0.04}
              value={this.state.currentHeight}
              onChange={onHeightChange}
            />
          </div>
        </CardText>
      </Card>
      <Card>
        <CardHeader style={headerStyle} title="Y-Axis Display" />
        <CardText>
          <div>
            <Toggle
              label="Autoscale Y-Axis"
              labelPosition="right"
              onToggle={this.setAutoScale}
              toggled={this.state.autoScale}
            />
          </div>
          <div>
            {yAxisControls}
          </div>
        </CardText>
      </Card>
    </div>);
  }
}

TrackViewSettings.propTypes = {
   guid: PropTypes.string,
   model: PropTypes.object,
};

export default TrackViewSettings;
