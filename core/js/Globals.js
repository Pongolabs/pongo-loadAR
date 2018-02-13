/* ==========================================================================
   GLOBALS
   ========================================================================== */


///Constants
var TRUCK_MAX_WIDTH = 2.5;
var TRUCK_MAX_HEIGHT = 4;
var TRUCK_MAX_DEPTH = 12.5;
var PLATE_WIDTH_RATIO = 17;
var PLATE_HEIGHT_RATIO = 6;
var PLATE_DRAW_RATIO = 8; //change this to get a bigger plate on screen
var PLATE_DRAW_COLOUR = "#ff5d00";
var GROUND_SCALE = 15; //the factor by which to multiply the initial ground plane
var RENDER_GROUND = false; // toggle rendering planes or not as a 3D object for debugging
var DISPLAY_PANEL_RESOLUTION = 256;
var SCREEN_WIDTH = window.innerWidth;
var SCREEN_HEIGHT = window.innerHeight;

var AR_SUPPORTED = false;
var APP_INITIALIZED = false;

var app;
