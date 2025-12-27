import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Toaster
      position="top-right"
      reverseOrder={false}
      toastOptions={{
        duration: 4000,
        success: {
          style: {
            background: "#16a34a",
            color: "white",
            fontSize: "bold",
            cursor: "pointer",
          },
        },
        error: {
          style: {
            background: "#dc2626",
            color: "white",
            fontSize: "bold",
            cursor: "pointer",
          },
        },
      }}
    />
    <App />
  </StrictMode>
);
