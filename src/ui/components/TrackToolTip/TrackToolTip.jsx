// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";

// Styles
import "./TrackToolTip.scss";

import Util from "../../helpers/util.js";

function TrackToolTip(props) {
  const style = {
    transform: `translate(${props.x}px, ${props.y}px) translateY(-50%)`
  };
  const relativeBp = Util.chromosomeRelativeBasePair(props.basePair);
  let bp = "";
  if (relativeBp) {
    const chrName =
      "chr " + Util.chromosomeIndexToName(relativeBp.chromosomeIndex);
    bp = chrName + " " + Util.roundToHumanReadable(relativeBp.basePair);
  }

  const dataValues = [];
  props.values.forEach(value => {
    const colorIdx = dataValues.length;
    const colorStyle = {
      backgroundColor: "rgb(" + props.colors[colorIdx].join(",") + ")"
    };
    const formattedValue = typeof value === "number" ? value.toFixed(3) : value;
    dataValues.push(
      <tr key={colorIdx}>
        <td>
          <div style={colorStyle} className="legend" />
        </td>
        <td>{formattedValue}</td>
      </tr>
    );
  });
  return (
    <div className="track-tool-tip">
      <div style={style} className="track-tool-tip-arrow">
        <div className="track-tool-tip-inner">
          <div>{bp}</div>
          <table>
            <tbody>{dataValues}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

TrackToolTip.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  basePair: PropTypes.number.isRequired,
  values: PropTypes.array.isRequired,
  colors: PropTypes.array.isRequired
};

export default TrackToolTip;
