import React from 'react';
import ReactDOM from 'react-dom';
import './GlobalStyling.css';
import MainContent from './MainContent';
import reportWebVitals from './reportWebVitals';
import Footer from "./Footer";

ReactDOM.render(
  <React.StrictMode>
    <MainContent />
    <Footer/>
  </React.StrictMode>,
  document.getElementById('root')
);

reportWebVitals();
