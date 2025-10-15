import "./style.css";

// Create the heading element
const heading: HTMLHeadingElement = document.createElement("h1");
heading.textContent = "Sketchpad";

// Create the canvas element
const canvas: HTMLCanvasElement = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;

// Get the 2D rendering context
const ctx = canvas.getContext("2d");

// A good practice check to ensure the context was retrieved
if (!ctx) {
  throw new Error("Could not get 2D rendering context for canvas.");
}

// Append the created elements to the document's body
document.body.appendChild(heading);
document.body.appendChild(canvas);
