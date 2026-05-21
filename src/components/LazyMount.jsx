import { useEffect, useRef, useState } from "react";
export function LazyMount({ children, rootMargin = "300px", minHeight = "100vh" }) {
  const [shouldMount, setShouldMount] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (shouldMount) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldMount(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [shouldMount, rootMargin]);

  return (
    <div ref={ref} style={{ minHeight: shouldMount ? undefined : minHeight }}>
      {shouldMount ? children : null}
    </div>
  );
}