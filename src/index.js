import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import Body from "./body";
import Footer from "./footer";
import TitleBar from "./titleBar";

ReactDOM.render((
        <BrowserRouter>
            <TitleBar />
            <Body />
            <Footer />
        </BrowserRouter>
    ), document.getElementById('root')
);
