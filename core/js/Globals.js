/* ==========================================================================
   GLOBALS
   ========================================================================== */


///Constants
var TRUCK_MAX_WIDTH = 2.5;
var TRUCK_MAX_HEIGHT = 4;
var TRUCK_MAX_DEPTH = 12.5;
var TRUCK_BACK_SIZE = 2;

var PLATE_WIDTH_RATIO = 17;
var PLATE_HEIGHT_RATIO = 6;
var PLATE_DRAW_RATIO = 7; //change this to get a bigger plate on screen

var TARGET_WIDTH = 120;
var TARGET_HEIGHT = 120; // sync this with CSS

var PLATE_DRAW_COLOUR = "rgba(248,147,31,0.4)";
var COLOUR_NODE_SOLVED = 0x00ff00;
var COLOUR_NODE_WARNING = 0xff7f00;
var COLOUR_NODE_URGENT = 0xff0000;
var COLOUR_NODE_DEFAULT = 0xff0000;
var GROUND_SCALE = 15; //the factor by which to multiply the initial ground plane
var RENDER_GROUND = true; // toggle rendering planes or not as a 3D object for debugging
var DISPLAY_PANEL_RESOLUTION = 256;
var SCREEN_WIDTH = window.innerWidth;
var SCREEN_HEIGHT = window.innerHeight;
var VIEW_CAST_INTERVAL = 500; // the frequency with which the program casts a ray to search for objects, 1000 being a full second
var EXCLUSION_ZONE_RADIUS = 1.4;
var EXCLUSION_ZONE_WIDTH = EXCLUSION_ZONE_RADIUS * 1.1 - EXCLUSION_ZONE_RADIUS;

var NODE_SIZE = 0.15; // default size of a node, 15% of the sprite
var NODE_SIZE_SELECTED = 0.25; // when 'selected' a node shall double in size. these values are largely arbitrary and can be changed ot whatever feels appropriate

var AR_SUPPORTED = false; // flag for AR not supported
var APP_INITIALIZED = false; // flag for app initialization

var GROUND_PLANE_FOUND = false; // flag for ground plane found
var UPDATE_VR_RUNNING = false; // flag for ground plane found
var PLATE_FOUND = false; // flag for plate found
var PLATE_DEBUG_MODE = true;

// messages
var MESSAGE_DETECTING_GROUND = "<span>Detecting ground ...</span><b>Move phone around</b> to detect ground plane"
var MESSAGE_DETECTING_PLATE = "<span>Find license plate</span><b>Place target on plate</b> and press button"
var MESSAGE_PLATE_FINDING = "<span>Detecting license plate ...</span><b>Please wait</b>, this may take a few seconds"
var MESSAGE_PLATE_FOUND = "<span>License plate detected</span>Registration number detected as {registrationNumber}"
var MESSAGE_PLATE_NOT_FOUND = "<span>License plate not found</span>Check Internet connection and try again"
var MESSAGE_VIEW_START = "<span>Find info point</span>Place info point inside target and press button"


var app;
