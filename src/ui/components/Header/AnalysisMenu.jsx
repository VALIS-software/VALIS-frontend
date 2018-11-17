import * as React from "react";
import Paper from 'material-ui/Paper';
import Menu from 'material-ui/Menu';
import MenuItem from 'material-ui/MenuItem';
import Divider from 'material-ui/Divider';
import ArrowDropRight from 'material-ui/svg-icons/navigation-arrow-drop-right';
import DropDownMenu from 'material-ui/DropDownMenu';

const style = {
  display: 'inline-block',
  margin: '16px 32px 16px 0',
};

const AnalysisMenu = () => (
  <DropDownMenu value={1}>
      <Menu desktop={true} width={320}>
        <MenuItem value={1} primaryText="Analysis" insetChildren={true} />
        <MenuItem
          primaryText="Custom: 1.2"
          checked={true}
          rightIcon={<ArrowDropRight />}
          menuItems={[
            <MenuItem
              primaryText="Show"
              rightIcon={<ArrowDropRight />}
              menuItems={[
                <MenuItem primaryText="Show Level 2" />,
                <MenuItem primaryText="Grid lines" checked={true} />,
                <MenuItem primaryText="Page breaks" insetChildren={true} />,
                <MenuItem primaryText="Rules" checked={true} />,
              ]}
            />,
            <MenuItem primaryText="Grid lines" checked={true} />,
            <MenuItem primaryText="Page breaks" insetChildren={true} />,
            <MenuItem primaryText="Rules" checked={true} />,
          ]}
        />
        <Divider />
        <MenuItem primaryText="Add space before paragraph" />
        <MenuItem primaryText="Add space after paragraph" />
        <Divider />
        <MenuItem primaryText="Custom spacing..." />
      </Menu>
  </DropDownMenu>
);

export default AnalysisMenu;
