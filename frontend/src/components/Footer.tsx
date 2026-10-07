import { Button } from "../pages/ui/button";
import { useNavigate } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();
  return (
    <footer className="border-t bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Security
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Careers
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Documentation
                </a>
              </li>
              <li>
                <Button
                  variant="link"
                  className="p-0 h-auto text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/help")}
                >
                  Help Center
                </Button>
              </li>
              <li>
                <Button
                  variant="link"
                  className="p-0 h-auto text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/contact")}
                >
                  Contact
                </Button>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Button
                  variant="link"
                  className="p-0 h-auto text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/privacy")}
                >
                  Privacy
                </Button>
              </li>
              <li>
                <Button
                  variant="link"
                  className="p-0 h-auto text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/terms")}
                >
                  Terms
                </Button>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-12 pt-8 text-center text-muted-foreground">
          <p>© 2026 RetailLocator. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
