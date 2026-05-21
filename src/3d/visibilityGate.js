export function createVisibilityGate(canvas, onWakeCallback) {
 let isTabVisible = !document.hidden;
 let isCanvasVisible = true;
 let disposed = false;

 const wakeCallbacks = [];
 if (typeof onWakeCallback === "function") wakeCallbacks.push(onWakeCallback);

 const fireWake = () => {
  if (disposed) return;
  for (const cb of wakeCallbacks) {
   try {
    cb();
   } catch (e) {
    console.warn("[visibilityGate] wake callback error:", e);
   }
  }
 };

 const onVisibilityChange = () => {
  const next = !document.hidden;
  if (next === isTabVisible) return;
  isTabVisible = next;
  if (isTabVisible && isCanvasVisible) fireWake();
 };
 document.addEventListener("visibilitychange", onVisibilityChange);

 const io = new IntersectionObserver(
  (entries) => {
   const next = entries[0]?.isIntersecting ?? true;
   if (next === isCanvasVisible) return;
   isCanvasVisible = next;
   if (isTabVisible && isCanvasVisible) fireWake();
  },
  { threshold: 0.01 },
 );
 io.observe(canvas);

 return {
  shouldAnimate: () => !disposed && isTabVisible && isCanvasVisible,
  onWake: (cb) => {
   if (typeof cb === "function") wakeCallbacks.push(cb);
  },
  dispose: () => {
   if (disposed) return;
   disposed = true;
   document.removeEventListener("visibilitychange", onVisibilityChange);
   io.disconnect();
   wakeCallbacks.length = 0;
  },
 };
}
