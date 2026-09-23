import { useEffect, useState, type ReactNode } from "react";

import { MobileFallback } from "../screens/MobileFallback";

const unsupportedDeviceQuery =
  "(max-width: 899px), (hover: none) and (pointer: coarse)";

interface DesktopGuardProps {
  children: ReactNode;
}

export function DesktopGuard({ children }: DesktopGuardProps) {
  const [isUnsupported, setIsUnsupported] = useState(
    () => window.matchMedia(unsupportedDeviceQuery).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(unsupportedDeviceQuery);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsUnsupported(event.matches);
    };

    setIsUnsupported(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isUnsupported ? <MobileFallback /> : children;
}

