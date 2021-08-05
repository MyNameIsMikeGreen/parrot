import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import Body from "./body";
import Footer from "./footer";

ReactDOM.render((
        <BrowserRouter>
            <Body />
            <Footer />
        </BrowserRouter>
    ), document.getElementById('root')
);
