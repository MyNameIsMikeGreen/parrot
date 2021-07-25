import './GlobalStyling.css';
import platypusLogo from './media/Platypus_Logo.png'
import githubLogo from './media/GitHub_Logo.png'
import linkedInLogo from './media/LinkedIn_Logo.png'

function MainContent() {
  return (
    <div id="parrot-main-content">
        <div id="parrot-title-block">
            <div className="parrot-title-element"><h1 id="parrot-title-element-name">Mike Green</h1></div>
            <div className="parrot-title-element"><h2 id="parrot-title-element-role">Software Engineer</h2></div>
        </div>

        <div id="parrot-outlinks">
            <div className="parrot-outlink">
                <a href="https://github.com/MyNameIsMikeGreen">
                    <img src={githubLogo} alt="GitHub Logo"/>
                    <div className="parrot-outlink-main-text">GitHub</div>
                    <div className="parrot-outlink-additional-text">Software Projects</div>
                </a>
            </div>

            <div className="parrot-outlink">
                <a href="https://MyNameIsMikeGreen.co.uk">
                    <img src={platypusLogo} alt="Platypus Logo"/>
                    <div className="parrot-outlink-main-text">MyNameIsMikeGreen.co.uk</div>
                    <div className="parrot-outlink-main-text">Recipe Server</div>
                </a>
            </div>

            <div className="parrot-outlink">
                <a href="https://uk.linkedin.com/in/MyNameIsMikeGreen">
                    <img src={linkedInLogo} alt="LinkedIn Logo"/>
                    <div className="parrot-outlink-main-text">LinkedIn</div>
                    <div className="parrot-outlink-main-text">Networking</div>
                </a>
            </div>
        </div>
    </div>
  );
}

export default MainContent;
