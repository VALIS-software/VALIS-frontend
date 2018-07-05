import * as React from "react";
import * as ReactDOM from "react-dom";
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

import App from "./App";

import './index.html';
import './index.scss';
import { SiriusApi } from "../lib/sirius/SiriusApi";
import { API_BASE_URL } from "./ui/helpers/constants";

// set sirius API root
SiriusApi.apiUrl = API_BASE_URL;

ReactDOM.render(
	<MuiThemeProvider>
		<App />
	</MuiThemeProvider>,
	document.getElementById('root')
);