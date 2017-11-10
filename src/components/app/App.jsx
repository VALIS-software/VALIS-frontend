// Dependencies
import React from 'react';
// Components
import Header from '../header/Header.jsx';
import MultiTrackViewer from '../MultiTrackViewer/MultiTrackViewer.jsx';
import Footer from '../footer/Footer.jsx';

// Styles
import './App.scss';


function App() {
  return (
    <div className="site-wrapper">
      <Header />
      <MultiTrackViewer />
      <Footer />
    </div>
  );
}

export default App;
