import { useEffect } from 'react';
declare global {
  interface Window {
    // Optional function property 'frameworkReady' in the 'Window' interface
    frameworkReady?: () => void;
  }
}

// A custom hook that invokes the 'frameworkReady' function when the component mounts
export function useFrameworkReady() {
  useEffect(() => {
    window.frameworkReady?.();
  });
}
