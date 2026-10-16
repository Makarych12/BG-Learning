import {recordReactCommit} from "./performance-metrics";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <React.Profiler id="App" onRender={recordReactCommit}><App /></React.Profiler>
  </React.StrictMode>,
);
