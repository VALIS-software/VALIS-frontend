// Dependencies
import React from 'react';
// Components
import Header from '../header/Header.jsx';
import MultiTrackViewer from '../MultiTrackViewer/MultiTrackViewer.jsx';

// Styles
import './App.scss';


function App() {
  return (
    <div className="site-wrapper">
      <Header />
      <MultiTrackViewer />
    </div>
  );
}

export default App;
