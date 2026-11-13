import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setIsMobile(false);
      return undefined;
    }

    let cleanup: (() => void) | undefined = undefined;

    try {
      const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
      if (mql) {
        const onChange = () => {
          setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        };

        if (typeof mql.addEventListener === "function") {
          mql.addEventListener("change", onChange);
          cleanup = () => mql.removeEventListener("change", onChange);
        } else if (typeof (mql as any).addListener === "function") {
          (mql as any).addListener(onChange);
          cleanup = () => (mql as any).removeListener(onChange);
        }

        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      } else {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      }
    } catch {
      setIsMobile(typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false);
    }

    return cleanup;
  }, []);

  return !!isMobile;
}
