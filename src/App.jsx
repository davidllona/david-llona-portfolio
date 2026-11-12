import { useCallback, useEffect, useRef, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Experience } from "./experience/Experience";
import { useDesktopControls } from "./experience/useDesktopControls";
import { ErrorBoundary, Fallback } from "./ui/Fallback";
import { Hud } from "./ui/Hud";
import { Loader } from "./ui/Loader";
import { Modal } from "./ui/Modal";
import { StartOverlay } from "./ui/StartOverlay";
import { Flash } from "./ui/Flash";
import { ThemeToggle } from "./ui/ThemeToggle";
import { TouchControls } from "./ui/TouchControls";
import { WoodyMenu } from "./ui/WoodyMenu";
import { hasWebGL } from "./ui/webgl";

// El dedo es el puntero principal: móviles y tabletas.
const prefersTouch = () => window.matchMedia("(pointer: coarse)").matches;

function App() {
 const [webgl] = useState(hasWebGL);
 // Móviles y tabletas usan el nivel de calidad ligero.
 const [lowPower] = useState(prefersTouch);
 // Cómo se controla: se supone por el dispositivo y se confirma al entrar,
 // según se haya tocado con el dedo o hecho clic con el ratón.
 const [touch, setTouch] = useState(prefersTouch);
 const [active, setActive] = useState(false);
 // La estación tarda un momento en descargar sus piezas.
 const [ready, setReady] = useState(false);
 const lastPointerType = useRef("mouse");
 const onReady = useCallback(() => setReady(true), []);

 useDesktopControls();

 // Esc pausa y vuelve a la pantalla de inicio.
 useEffect(() => {
  // (Si hay una ventana abierta, Esc solo la cierra.)
  const onKey = (event) => event.key === "Escape" && !document.querySelector(".modal") && setActive(false);
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
 }, []);

 const enter = () => {
  if (!ready) return;
  // Se confirma cómo se controla según se haya entrado con el dedo o con el ratón.
  setTouch(lastPointerType.current === "touch");
  setActive(true);
 };

 if (!webgl) {
  return (
   <>
    <Fallback />
    <SpeedInsights />
    <Analytics />
   </>
  );
 }

 return (
  <>
   <ErrorBoundary>
    <Experience active={active} lowPower={lowPower} onReady={onReady} />
    <Flash />
    <StartOverlay
     visible={!active}
     ready={ready}
     touch={touch}
     onPointerDown={(event) => {
      lastPointerType.current = event.pointerType;
     }}
     onEnter={enter}
    />
    {active && <Hud touch={touch} />}
    {active && touch && <TouchControls onPause={() => setActive(false)} />}
    {active && <ThemeToggle />}
    {active && <WoodyMenu />}
    {active && <Modal />}
    <Loader ready={ready} />
   </ErrorBoundary>
   <SpeedInsights />
   <Analytics />
  </>
 );
}

export default App;
