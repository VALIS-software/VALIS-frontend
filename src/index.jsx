import React from 'react';
import ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader'; // required

import App from './components/App/App.jsx';

import './index.scss';

function renderApp() {
  ReactDOM.render(
    <AppContainer>
      <App />
    </AppContainer>,
    document.getElementById('main')
  );
}

renderApp(); // Renders App on init

if (module.hot) {
  // Renders App every time a change in code happens.
  module.hot.accept('./components/App/App.jsx', renderApp);
}
