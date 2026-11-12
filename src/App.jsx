import { useCallback, useEffect, useRef, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Tracker } from "./achievements/Tracker";
import { Sounds } from "./audio/Sounds";
import { Experience } from "./experience/Experience";
import { useDesktopControls } from "./experience/useDesktopControls";
import { emit, events, rig } from "./experience/state";
import { AchievementToast, AchievementsPanel } from "./ui/Achievements";
import { ErrorBoundary, Fallback } from "./ui/Fallback";
import { Hud } from "./ui/Hud";
import { Loader } from "./ui/Loader";
import { Modal } from "./ui/Modal";
import { QuickMenu } from "./ui/QuickMenu";
import { Sheet } from "./ui/Sheet";
import { SoundToggle } from "./ui/SoundToggle";
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
 // ¿Se ha entrado ya alguna vez? Antes, la portada es la bienvenida; después, la pausa.
 const [entered, setEntered] = useState(false);
 // La estación tarda un momento en descargar sus piezas.
 const [ready, setReady] = useState(false);
 // Portfolio legible abierto encima (menú rápido o modo directo): sección a mostrar.
 const [sheet, setSheet] = useState(null);
 const closeSheet = useCallback(() => setSheet(null), []);
 const [achievements, setAchievements] = useState(false);
 const closeAchievements = useCallback(() => setAchievements(false), []);
 // ¿Ha terminado el descenso desde la bienvenida? Hasta entonces no hay interfaz de juego.
 const [arrived, setArrived] = useState(false);
 useEffect(() => {
  const onArrived = () => setArrived(true);
  events.addEventListener("arrived", onArrived);
  return () => events.removeEventListener("arrived", onArrived);
 }, []);
 const playing = active && arrived;
 const lastPointerType = useRef("mouse");
 const onReady = useCallback(() => setReady(true), []);

 useDesktopControls();

 // Esc pausa y vuelve a la pantalla de inicio.
 useEffect(() => {
  // (Si hay una ventana abierta, Esc solo la cierra.)
  const onKey = (event) => event.key === "Escape" && !document.querySelector(".modal, .sheet") && setActive(false);
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
 }, []);

 const enter = () => {
  if (!ready) return;
  // Se confirma cómo se controla según se haya entrado con el dedo o con el ratón.
  setTouch(lastPointerType.current === "touch");
  // La primera vez, la cámara desciende del islote de bienvenida al planeta.
  rig.introTarget = 0;
  setEntered(true);
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
     intro={!entered}
     ready={ready}
     touch={touch}
     onPointerDown={(event) => {
      lastPointerType.current = event.pointerType;
     }}
     onEnter={enter}
     onDirect={() => setSheet("proyectos")}
    />
    {playing && <Hud touch={touch} />}
    {playing && touch && <TouchControls onPause={() => setActive(false)} />}
    <Sounds active={active} />
    {playing && <ThemeToggle />}
    {playing && <SoundToggle />}
    {playing && <WoodyMenu />}
    {active && <Modal />}
    {playing && !sheet && !achievements && <QuickMenu onOpen={setSheet} onAchievements={() => setAchievements(true)} />}
    {achievements && <AchievementsPanel onClose={closeAchievements} />}
    <Tracker active={active} />
    {playing && <AchievementToast />}
    {sheet && (
     <Sheet
      section={sheet}
      onClose={closeSheet}
      // Solo jugando tiene sentido que Woody te lleve.
      onGuide={
       active
        ? (place) => {
           emit("guide", { to: place });
           setSheet(null);
          }
        : undefined
      }
     />
    )}
    <Loader ready={ready} />
   </ErrorBoundary>
   <SpeedInsights />
   <Analytics />
  </>
 );
}

export default App;
