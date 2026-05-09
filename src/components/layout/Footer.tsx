import { type Component } from "solid-js";
import ConnectionStatus from "../ConnectionStatus";

const Footer: Component = () => {
  return (
    <footer class="footer footer-center p-4 bg-base-100 text-base-content border-t border-base-300">
      <div class="flex flex-col items-center gap-2">
        <ConnectionStatus />
        <span class="text-xs opacity-50">AriaWeb v0.1.0</span>
      </div>
    </footer>
  );
};

export default Footer;
