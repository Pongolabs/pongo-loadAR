/* ==========================================================================
   GLOBALS
   ========================================================================== */

var vrDisplay;
var vrControls;
var arView;
var canvas;
var camera;
var scene;
var renderer;
var truckMesh; //the 3D cube used to represent the truck in the 3D space
var truckBackPanel;
var groundPlane; // global container for the first discovered plane object
var groundPlaneMesh; // represents the 3DPlane in the worldspace
var displayPanel = []; // A collection of our object3Ds that are placed around the instance to designate various information as well as having usable functions
var openALPRReady = false;
var buffer = document.createElement('canvas');
var canvasOverlay;
var plateSeekRegion; //contains the x and y coords on the main canvas of the bounding box that designates where to search for plate info

var colors = [
  new THREE.Color( 0xffffff ),
  new THREE.Color( 0xffff00 ),
  new THREE.Color( 0xff00ff ),
  new THREE.Color( 0xff0000 ),
  new THREE.Color( 0x00ffff ),
  new THREE.Color( 0x00ff00 ),
  new THREE.Color( 0x0000ff ),
  new THREE.Color( 0x000000 )
];

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
