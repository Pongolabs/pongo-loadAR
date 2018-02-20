﻿/* ==========================================================================
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
var PLATE_DRAW_COLOUR = "#ff7E00";
var COLOUR_NODE_SOLVED = 0x00ff00;
var COLOUR_NODE_WARNING = 0xff7f00;
var COLOUR_NODE_URGENT = 0xff0000;
var COLOUR_NODE_DEFAULT = 0xff0000;
var GROUND_SCALE = 15; //the factor by which to multiply the initial ground plane
var RENDER_GROUND = false; // toggle rendering planes or not as a 3D object for debugging
var DISPLAY_PANEL_RESOLUTION = 256;
var SCREEN_WIDTH = window.innerWidth;
var SCREEN_HEIGHT = window.innerHeight;
var VIEW_CAST_INTERVAL = 1000; // the frequency with which the program casts a ray to search for objects
var EXCLUSION_ZONE_RADIUS = 1.4;
var EXCLUSION_ZONE_WIDTH = EXCLUSION_ZONE_RADIUS * 1.1 - EXCLUSION_ZONE_RADIUS;

var AR_SUPPORTED = false;
var APP_INITIALIZED = false;

var app;
