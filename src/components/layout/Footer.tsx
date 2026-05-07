import { type Component } from "solid-js";

const Footer: Component = () => {
    return (
        <footer>
            <nav class="footer-nav">
                <div class="footer-links">
                    <ul>
                        <li><a href="#">About</a></li>
                    </ul>
                </div>
                <div class="footer-info">
                    <span>AriaWeb v0.1.0</span>
                </div>
            </nav>
        </footer>
    );
};

export default Footer;
