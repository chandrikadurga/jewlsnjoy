import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if viewport is mobile/tablet based on a pixel breakpoint.
 * Uses window.matchMedia for high-performance reactive updates without polling.
 * Default breakpoint: 768px (matches the mobile CSS media queries in Admin).
 * 
 * @param {number} breakpoint - Breakpoint in pixels (default: 768)
 * @returns {boolean} isMobile
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= breakpoint;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const updateMatch = (e) => setIsMobile(e.matches);

    // Initial check
    setIsMobile(mediaQuery.matches);

    // Modern and legacy event listener support
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateMatch);
      return () => mediaQuery.removeEventListener('change', updateMatch);
    } else {
      mediaQuery.addListener(updateMatch);
      return () => mediaQuery.removeListener(updateMatch);
    }
  }, [breakpoint]);

  return isMobile;
}

export default useIsMobile;
