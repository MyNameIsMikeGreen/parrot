import githubLogo from "../media/GitHub_Logo.png";
import platypusLogo from "../media/Platypus_Logo.png";
import linkedInLogo from "../media/LinkedIn_Logo.png";
import * as React from "react";

export default class Links extends React.Component {

    render() {
        return (
            <div id="parrot-outlinks">

                <div className="parrot-outlink">
                    <a href="https://github.com/MyNameIsMikeGreen">
                        <img src={githubLogo} alt="GitHub Logo"/>
                        <div className="parrot-outlink-main-text">GitHub</div>
                        <div className="parrot-outlink-additional-text">Software Projects</div>
                    </a>
                </div>

                <div className="parrot-outlink">
                    <a href="https://uk.linkedin.com/in/MyNameIsMikeGreen">
                        <img src={linkedInLogo} alt="LinkedIn Logo"/>
                        <div className="parrot-outlink-main-text">LinkedIn</div>
                        <div className="parrot-outlink-additional-text">Networking</div>
                    </a>
                </div>

                <div className="parrot-outlink">
                    <a href="http://pi:8001">
                        <img src={platypusLogo} alt="Platypus Logo"/>
                        <div className="parrot-outlink-main-text">Platypus</div>
                        <div className="parrot-outlink-additional-text">Private Network Only: Recipes</div>
                    </a>
                </div>

                <div className="parrot-outlink">
                    <a href="http://pi:8000">
                        <div className="parrot-outlink-main-text">Pelican</div>
                        <div className="parrot-outlink-additional-text">Private Network Only: Media Server Control</div>
                    </a>
                </div>

            </div>
        );
    }
}
