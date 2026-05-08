import { type Component } from "solid-js";
import ConnectionStatus from "../ConnectionStatus";

const Footer: Component = () => {
  return (
    <footer>
      <nav class="footer-nav">
        <div class="footer-links">
          <ConnectionStatus />
        </div>
        <div class="footer-info">
          <span>AriaWeb v0.1.0</span>
        </div>
      </nav>
    </footer>
  );
};

export default Footer;
