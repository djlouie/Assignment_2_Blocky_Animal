// ColoredPoint.js (c) 2012 matsuda

// Vertex shader program
var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    uniform float u_Size;
    void main() {
        gl_Position = a_Position;
        // gl_PointSize = 10.0;
        gl_PointSize = u_Size;
    }`;

// Fragment shader program
var FSHADER_SOURCE = `
    precision mediump float;
    uniform vec4 u_FragColor;
    void main() {
        gl_FragColor = u_FragColor;
    }`;

// Global Variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size

// Setup GL context
function setupWebGL(){
    // Retrieve <canvas> element
    canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    // gl = getWebGLContext(canvas);
    // Added flag to tell webgl which buffer to preserve
    gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: false });
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
    
    // Enable Blending So That The Alpha Works Correctly (Learned this from ChatGPT)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

}

// Get attributes from the GPU
function connectVariablesToGLSL(){
    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    // // Get the storage location of a_Position
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return;
    }

    // Get the storage location of u_FragColor
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }

    // Get the storage location of u_Size
    u_Size = gl.getUniformLocation(gl.program, 'u_Size');
    if (!u_Size) {
        console.log('Failed to get the storage location of u_Size');
        return;
    }
}

// Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;
const TREX = 3;

// Globals related to UI elements
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5;
let g_selectedType = POINT;
let g_selectedSegments = 10;

// Set up actions for the HTML UI elements
function addActionsForHtmlUI(){

    // Button Events (Shape Type)
    document.getElementById('red').onclick = function() {
        g_selectedColor = [1.0, 0.0, 0.0, g_selectedColor[3]];
        let redSlide = document.getElementById('redSlide');
        let greenSlide = document.getElementById('greenSlide');
        let blueSlide = document.getElementById('blueSlide');
        [redSlide.value, greenSlide.value, blueSlide.value, ] = [redSlide.max, 0.0, 0.0];
    };
    document.getElementById('green').onclick = function() {
        g_selectedColor = [0.0, 1.0, 0.0, g_selectedColor[3]];
        let redSlide = document.getElementById('redSlide');
        let greenSlide = document.getElementById('greenSlide');
        let blueSlide = document.getElementById('blueSlide');
        [redSlide.value, greenSlide.value, blueSlide.value] = [0.0, greenSlide.max, 0.0];
    };
    document.getElementById('blue').onclick = function() {
        g_selectedColor = [0.0, 0.0, 1.0, g_selectedColor[3]];
        let redSlide = document.getElementById('redSlide');
        let greenSlide = document.getElementById('greenSlide');
        let blueSlide = document.getElementById('blueSlide');
        [redSlide.value, greenSlide.value, blueSlide.value] = [0.0, 0.0, blueSlide.max];
    };
    document.getElementById('clear').onclick = function() {g_shapesList = []; renderAllShapes(); };
    document.getElementById('customDrawing').onclick = function() {
        let point = new TRex(); point.position = [0, 0]; point.color = [1.0, 1.0, 1.0, 1.0]; point.size = 25; 
        g_shapesList = [point]; 
        renderAllShapes(); 
    };


    document.getElementById('pointButton').onclick = function() {g_selectedType = POINT};
    document.getElementById('triButton').onclick = function() {g_selectedType = TRIANGLE};
    document.getElementById('circleButton').onclick = function() {g_selectedType = CIRCLE};
    document.getElementById('trexButton').onclick = function() {g_selectedType = TREX};

    // Color Slider Events
    document.getElementById('redSlide').addEventListener('mouseup', function() { g_selectedColor[0] = this.value/100; });
    document.getElementById('greenSlide').addEventListener('mouseup', function() { g_selectedColor[1] = this.value/100; });
    document.getElementById('blueSlide').addEventListener('mouseup', function() { g_selectedColor[2] = this.value/100; });

    // Size + Segments Slider Events
    document.getElementById('sizeSlide').addEventListener('mouseup', function() { g_selectedSize = this.value; })
    document.getElementById('alphaSlide').addEventListener('mouseup', function() { g_selectedColor[3] = this.value; })
    document.getElementById('segmentsSlide').addEventListener('mouseup', function() { g_selectedSegments = this.value; })
}

function main() {

    // Set up canvas and gl variables
    setupWebGL();
    // Set up GLSL shader programs and connect GLSL variables
    connectVariablesToGLSL();

    // Set up actions for the HTML UI elements
    addActionsForHtmlUI();

    // Register function (event handler) to be called on a mouse press
    canvas.onmousedown = click;
    canvas.onmousemove = function(ev) { if (ev.buttons == 1) { click(ev) } };

    // Specify the color for clearing <canvas>
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);
}

// Extract the event click and change it to webGL coordinates
function convertCoordinateEventsToGL(ev){
    var x = ev.clientX; // x coordinate of a mouse pointer
    var y = ev.clientY; // y coordinate of a mouse pointer
    var rect = ev.target.getBoundingClientRect();

    x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
    y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

    return ([x, y]);
}

// Draw every shape that is supposed to be in the canvas
function renderAllShapes(){
    // Check the time at the start of this function
    var startTime = performance.now()
    
    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Draw each shape in the list
    var len = g_shapesList.length;
    for(var i = 0; i < len; i++) {
        g_shapesList[i].render();
    }

    // Check the time at the end of the function, and show on webpage
    var duration = performance.now() - startTime;
    sendTextToHTML("numdot: " + len + " ms: " + Math.floor(duration) + " fps " + Math.floor(10000/duration)/10, "numdot")
}

// Set the text of an HTML element
function sendTextToHTML(text, htmlID){
    var htmlElm = document.getElementById(htmlID);
    if (!htmlElm) {
        console.log("Failed to get " + htmlID + " from HTML");
        return;
    }
    htmlElm.innerHTML = text;
}

var g_shapesList = [];

// var g_points = [];    // The array for the position of a mouse press
// var g_colors = [];    // The array to store the color of a point
// var g_sizes = [];   // The array to store the size of the point

function click(ev) {

    let [x, y] = convertCoordinateEventsToGL(ev);

    // Create and store the new point
    let point;
    if (g_selectedType == POINT){
        point = new Point();
    } else if (g_selectedType == TRIANGLE) {
        point = new Triangle();
    } else if (g_selectedType == CIRCLE){
        point = new Circle();
    } else {
        point = new TRex();
    }
    point.position = [x, y];
    point.color = g_selectedColor.slice();
    point.size = g_selectedSize;

    if (g_selectedType == CIRCLE){
        point.segments = g_selectedSegments;
    }

    g_shapesList.push(point);

    // // Store the coordinates to g_points array
    // g_points.push([x, y]);
    
    // // Store the selected color to the g_colors array
    // g_colors.push(g_selectedColor.slice());

    // // Store the size of the point
    // g_sizes.push(g_selectedSize);
    
    // // Store the coordinates to g_points array
    // if (x >= 0.0 && y >= 0.0) {            // First quadrant
    //     g_colors.push([1.0, 0.0, 0.0, 1.0]);    // Red
    // } else if (x < 0.0 && y < 0.0) { // Third quadrant
    //     g_colors.push([0.0, 1.0, 0.0, 1.0]);    // Green
    // } else {                                                 // Others
    //     g_colors.push([1.0, 1.0, 1.0, 1.0]);    // White
    // }

    renderAllShapes();
}
