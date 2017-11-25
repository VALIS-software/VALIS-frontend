// Dependencies
import React from 'react';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
// Components

import Header from '../Header/Header.jsx';
import MultiTrackViewer from '../MultiTrackViewer/MultiTrackViewer.jsx';

// Styles
import './App.scss';


function App() {
  return (
    <MuiThemeProvider>
      <div className="site-wrapper">
        <Header />
        <MultiTrackViewer />
      </div>
    </MuiThemeProvider>);
}

export default App;
