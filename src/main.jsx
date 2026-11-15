import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { prepareWorld } from "./worlds";
import "./styles/global.css";
import "./styles/ui.css";

const start = () =>
 createRoot(document.getElementById("root")).render(
  <StrictMode>
   <App />
  </StrictMode>,
 );
// (Solo en desarrollo, con ?world=twisted: se espera a que lleguen los datos de ese mundo.)
const pending = prepareWorld();
if (pending) pending.then(start);
else start();
