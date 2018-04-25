import * as React from "react";
import * as ReactDOM from "react-dom";
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

import App from "./App";

import './index.html';
import './index.scss';

ReactDOM.render(
	<MuiThemeProvider>
		<App/>
	</MuiThemeProvider>,
	document.getElementById('root')
);