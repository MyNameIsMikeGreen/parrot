import './App.css';
import githubLogo from './GitHub_Logo.png'

function App() {
  return (
    <div className="app">
        <div className="parrot-title-block">
            <div className="parrot-title-element"><h1>Mike Green</h1></div>
            <div className="parrot-title-element"><h2>Software Engineer</h2></div>
        </div>

        <div className="parrot-outlinks">
            <div className="parrot-outlink">
                <a href="https://MyNameIsMikeGreen.co.uk">MyNameIsMikeGreen.co.uk (Food Recipes)</a>
            </div>

            <div className="parrot-outlink">
                <a href="https://github.com/MyNameIsMikeGreen">
                    <img src={githubLogo} alt="GitHub Logo"/>
                    GitHub
                </a>
            </div>

            <div className="parrot-outlink">
                <a href="https://uk.linkedin.com/in/MyNameIsMikeGreen">LinkedIn</a>
            </div>
        </div>
    </div>
  );
}

export default App;
