import './GlobalStyling.css';

function Footer() {
  return (
    <footer className="parrot-footer">
      <div className="parrot-footer-copyright-statement">
          © Copyright 2020-{new Date().getFullYear()} Mike Green
      </div>
      <div className="parrot-footer-source-code-link">
          <a href="https://GitHub.com/MyNameIsMikeGreen/parrot">React.js source code for website available here</a>
      </div>
    </footer>
  );
}

export default Footer;
