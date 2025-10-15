import "./style.css";

// Create UI elements
const heading: HTMLHeadingElement = document.createElement("h1");
heading.textContent = "Sketchpad";

const canvas: HTMLCanvasElement = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;

const clearButton: HTMLButtonElement = document.createElement("button");
clearButton.textContent = "Clear";

// Append elements to the document
document.body.appendChild(heading);
document.body.appendChild(canvas);
document.body.appendChild(clearButton);

// Get the rendering context
const ctx = canvas.getContext("2d");

// State and Drawing Logic

let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Handles the drawing logic on the canvas.
function draw(e: MouseEvent) {
  // Guard clause: exit if not drawing OR if the context is missing.
  // This satisfies TypeScript's null check within the function.
  if (!isDrawing || !ctx) {
    return;
  }

  // Set drawing properties
  ctx.strokeStyle = "black";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Get mouse position relative to the canvas
  const rect = canvas.getBoundingClientRect();
  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;

  // Draw a line from the last point to the new point
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(currentX, currentY);
  ctx.stroke();

  // Update the last position
  [lastX, lastY] = [currentX, currentY];
}

// Event Listener Setup

// Only attach listeners and enable functionality if the context exists.
if (ctx) {
  canvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    [lastX, lastY] = [e.clientX - rect.left, e.clientY - rect.top];
  });

  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", () => (isDrawing = false));
  canvas.addEventListener("mouseleave", () => (isDrawing = false));

  clearButton.addEventListener("click", () => {
    // Because this callback is defined inside the `if (ctx)` block,
    // TypeScript knows `ctx` is valid here.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
} else {
  // Handle the error case gracefully if canvas isn't supported
  console.error("Canvas context could not be found. Drawing is disabled.");
  const errorMessage = document.createElement("p");
  errorMessage.textContent =
    "Sorry, your browser does not support this sketchpad.";
  document.body.insertBefore(errorMessage, canvas);
  canvas.style.display = "none";
  clearButton.style.display = "none";
}
