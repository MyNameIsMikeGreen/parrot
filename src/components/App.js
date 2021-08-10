import React from 'react';
import BodyRouter from "./BodyRouter";
import TitleBar from "./TitleBar";
import Footer from "./Footer";

export default class App extends React.Component {

    render() {
        return (
            <>
                <TitleBar />
                <BodyRouter />
                <Footer />
            </>
        );
    }

}
