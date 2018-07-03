import * as React from "react";
import * as ReactDOM from "react-dom";
<<<<<<< HEAD
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
=======
import GPUTextFonts from "./fonts/GPUTextFonts";

import App from "./components/App/App";
import "./index.scss";

function renderApp() {
  GPUTextFonts.init();
  ReactDOM.render(React.createElement(App), document.getElementById("main"));
}

renderApp(); // Renders App on init
>>>>>>> upstream/master
