import { useCallback, useEffect, useRef, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Tracker } from "./achievements/Tracker";
import { Sounds } from "./audio/Sounds";
import { unlock } from "./audio/engine";
import { Experience } from "./experience/Experience";
import { useDesktopControls } from "./experience/useDesktopControls";
import { events, rig, ui } from "./experience/state";
import { AchievementsPanel } from "./ui/Achievements";
import { ErrorBoundary, Fallback } from "./ui/Fallback";
import { stage } from "./ui/loaderControl";
import { Modal } from "./ui/Modal";
import { FootballHud } from "./ui/FootballHud";
import { QuickMenu } from "./ui/QuickMenu";
import { SoundToggle } from "./ui/SoundToggle";
import { StartOverlay } from "./ui/StartOverlay";
import { Flash } from "./ui/Flash";
import { ThemeToggle } from "./ui/ThemeToggle";
import { TouchControls } from "./ui/TouchControls";
import { TravelOverlay } from "./ui/TravelOverlay";
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
 // Jugando al fútbol la pantalla es para apuntar: se retiran el joystick y el salto.
 const [football, setFootball] = useState(false);
 useEffect(() => {
  const onFootball = (event) => {
   if (event.detail?.type === "enter") setFootball(true);
   else if (event.detail?.type === "exit") setFootball(false);
  };
  events.addEventListener("football", onFootball);
  return () => events.removeEventListener("football", onFootball);
 }, []);
 const lastPointerType = useRef("mouse");
 const onReady = useCallback(() => setReady(true), []);
 // El código ya está aquí y en marcha: primera etapa real de la carga.
 useEffect(() => stage("code"), []);

 useDesktopControls();

 // Esc pausa y vuelve a la pantalla de inicio.
 useEffect(() => {
  // (Si hay una ventana abierta, Esc solo la cierra.)
  const onKey = (event) => event.key === "Escape" && !ui.open && !document.querySelector(".woody-menu__list") && setActive(false);
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
    <TravelOverlay />
    <StartOverlay
     visible={!active}
     intro={!entered}
     ready={ready}
     touch={touch}
     onPointerDown={(event) => {
      lastPointerType.current = event.pointerType;
      // El contexto de audio se crea ya, al pulsar: la primera vez cuesta unos
      // 80 ms y, si se dejara para el clic (que llega al soltar), retrasaría
      // ese tanto el inicio del descenso.
      if (ready) unlock();
     }}
     onEnter={enter}
    />
    {playing && touch && !football && <TouchControls onPause={() => setActive(false)} />}
    {playing && <FootballHud touch={touch} />}
    <Sounds active={active} />
    {playing && <ThemeToggle />}
    {playing && <SoundToggle />}
    {playing && <WoodyMenu />}
    {active && <Modal />}
    {playing && !achievements && <QuickMenu onAchievements={() => setAchievements(true)} />}
    {achievements && <AchievementsPanel onClose={closeAchievements} />}
    <Tracker active={active} />
   </ErrorBoundary>
   <SpeedInsights />
   <Analytics />
  </>
 );
}

export default App;
