import { useEffect, useState } from "react";

export function useDemoLoading(delay = 650) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  return isLoading;
}
