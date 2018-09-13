import * as React from "react";
import * as ReactDOM from "react-dom";
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

import App from "./App";
import { SiriusApi } from 'valis';

import './index.html';
import './index.scss';

// determine API url from environment
const LOCAL_API_URL = 'http://127.0.0.1:5000';
let apiBaseUrl = '';
if (process != null && process.env != null) {
	if (process.env.API_URL != null) {
		// url override set
		apiBaseUrl = process.env.API_URL;
	} else {
		// use default dev url
		apiBaseUrl = process.env.dev ? LOCAL_API_URL : '';
	}
}

// set sirius API root
SiriusApi.apiUrl = apiBaseUrl;

// render app
ReactDOM.render(
	<MuiThemeProvider>
		<App apiBaseUrl={apiBaseUrl}/>
	</MuiThemeProvider>,
	document.getElementById('root')
);