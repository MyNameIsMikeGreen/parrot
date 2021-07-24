import './GlobalStyling.css';
import platypusLogo from './media/Platypus_Logo.png'
import githubLogo from './media/GitHub_Logo.png'
import linkedInLogo from './media/LinkedIn_Logo.png'

function MainContent() {
  return (
    <div id="parrot-main-content">
        <div id="parrot-title-block">
            <div className="parrot-title-element"><h1>Mike Green</h1></div>
            <div className="parrot-title-element"><h2>Software Engineer</h2></div>
        </div>

        <div id="parrot-outlinks">
            <div className="parrot-outlink">
                <a href="https://MyNameIsMikeGreen.co.uk">
                    <img src={platypusLogo} alt="Platypus Logo"/>
                    MyNameIsMikeGreen.co.uk (Food Recipes)
                </a>
            </div>

            <div className="parrot-outlink">
                <a href="https://github.com/MyNameIsMikeGreen">
                    <img src={githubLogo} alt="GitHub Logo"/>
                    GitHub
                </a>
            </div>

            <div className="parrot-outlink">
                <a href="https://uk.linkedin.com/in/MyNameIsMikeGreen">
                    <img src={linkedInLogo} alt="LinkedIn Logo"/>
                    LinkedIn
                </a>
            </div>
        </div>
    </div>
  );
}

export default MainContent;
