import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("buildicy_cookie_consent");
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("buildicy_cookie_consent", "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("buildicy_cookie_consent", "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner">
      <span className="cookie-icon"><Cookie size={18} /></span>
      <p>
        We use cookies to keep you signed in and improve your experience.{" "}
        <a href="https://aws.amazon.com/compliance/data-privacy-faq/" target="_blank" rel="noreferrer">
          Privacy policy
        </a>
      </p>
      <div className="cookie-actions">
        <Button size="sm" variant="outline" onClick={decline}>Decline</Button>
        <Button size="sm" className="primary-pill" onClick={accept}>Accept all</Button>
      </div>
      <button className="cookie-close" onClick={decline} aria-label="Close"><X size={14} /></button>
    </div>
  );
}
