import { useEffect, useRef, useState } from "react";

/**
 * LazyMount — monta el children solo cuando se acerca al viewport
 * ──────────────────────────────────────────────────────────────────────
 * Crítico para móviles con GPU limitada (ARM Mali-G68 y similares). El
 * portfolio tiene 5 secciones, cada una con su propio canvas WebGL (o
 * varios). Si todas se montan a la vez al activarse `mainReady`, nacen
 * ~9 contextos WebGL en paralelo → la GPU móvil colapsa por presión de
 * VRAM → secciones en blanco o sad face.
 *
 * Con este wrapper, cada sección espera a estar a ~300px del viewport
 * antes de montarse. Como el Hero ocupa 380vh, cuando el usuario llega
 * al final del Hero, Projects ya se está montando con margen. Cuando
 * llega a Projects, Lab se monta. Etc. En cualquier momento dado solo
 * hay 1-2 contextos WebGL activos en lugar de 9.
 *
 * El `minHeight` del placeholder mantiene la altura del documento
 * mientras el children no está montado, evitando que el scroll bar
 * "salte" cuando React inserta el contenido real. 100vh es un default
 * razonable para cualquier sección del portfolio; si una sección
 * necesita más altura, sobrescribe la prop.
 *
 * Una vez montado, el componente NO se desmonta al salir del viewport.
 * Esto evita la pausa visible si el usuario vuelve scroll-arriba. La
 * presión de VRAM no es problema porque el `visibilityGate` interno
 * de cada escena ya pausa su render loop cuando no es visible.
 */
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