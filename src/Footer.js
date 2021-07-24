import './GlobalStyling.css';

function Footer() {
  return (
    <footer className="parrot-footer">© Copyright 2020-{new Date().getFullYear()} Mike Green</footer>
  );
}

export default Footer;
