import * as React from "react";
import * as ReactDOM from "react-dom";
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import BasicTheme from "./ui/themes/BasicTheme";

import App from "./App";
import { SiriusApi, Canis} from 'valis';

import './index.html';
import './index.scss';

// determine API url from environment
const LOCAL_API_URL = 'http://127.0.0.1:5000';
const LOCAL_CANIS_API_URL = 'http://127.0.0.1:3000';
let apiBaseUrl = '';
let canisApiBaseUrl = '';
if (process != null && process.env != null) {
	if (process.env.API_URL != null) {
		// url override set
		apiBaseUrl = process.env.API_URL;
	} else {
		// use default dev url
		apiBaseUrl = process.env.dev ? LOCAL_API_URL : '';
	}

	if (process.env.CANIS_API_URL != null) {
		// url override set
		canisApiBaseUrl = process.env.CANIS_API_URL;
	} else {
		// use default dev url
		canisApiBaseUrl = process.env.dev ? LOCAL_CANIS_API_URL : null;
	}
}

// set sirius API root
SiriusApi.apiUrl = apiBaseUrl;

Canis.Api.apiUrl = canisApiBaseUrl;

if (!process.env.dev) {
	SiriusApi.getCanisApiUrl().then(url => {
		Canis.Api.apiUrl = url;
	});
}

// render app
ReactDOM.render(
	<MuiThemeProvider muiTheme={BasicTheme}>
		<App apiBaseUrl={apiBaseUrl}/>
	</MuiThemeProvider>,
	document.getElementById('root')
);