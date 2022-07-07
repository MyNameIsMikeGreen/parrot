import '../style.css';
import * as React from "react";

export default class TitleBar extends React.Component {

    render() {
        return (
            <div id="parrot-titlebar">
                <div id="parrot-titlebar-title-block">
                    <div className="parrot-titlebar-title-element">
                        <h1 id="parrot-titlebar-title-name"><a href="/">Mike Green Solutions</a></h1>
                    </div>
                    <div className="parrot-titlebar-title-element">
                        <h2 id="parrot-titlebar-title-role"><a href="/">Software Freelancing</a></h2>
                    </div>
                </div>
                <div id="parrot-titlebar-navigation-buttons">
                    <div className="parrot-titlebar-navigation-button"><a href="/">Links</a></div>
                    <div className="parrot-titlebar-navigation-button"><a href="/blog">Blog</a></div>
                </div>
            </div>
        );
    }

}
