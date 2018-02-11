/* 
*   LoadAR
*
*   Main class for application.
*
*   (c) Pongolabs 2018
*/

/* ======================================================================
   COMMON
   ====================================================================== */

///Global variables
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

function debug(message) {

    if (console) {
       console.log(message);
    }

    var text = $("#debug").text();
    $("#debug").text(text + message + "\n");
    $("#debug")[0].scrollTop = $("#debug")[0].scrollHeight; 
}

/* ======================================================================
   AR
   ====================================================================== */

/**
 * Use the `getARDisplay()` utility to leverage the WebVR API
 * to see if there are any AR-capable WebVR VRDisplays. Returns
 * a valid display if found. Otherwise, display the unsupported
 * browser message.
 */
THREE.ARUtils.getARDisplay().then(function (display) {
  if (display) {
    vrDisplay = display;
    init();
  } else {
    THREE.ARUtils.displayUnsupportedMessage();
  }
});

function init() {

  // Turn on the debugging panel
  // we may not actually need this
    scene = new THREE.Scene();
    var arDebug = new THREE.ARDebug(vrDisplay, scene, {
        //showLastHit: true,
        showPoseStatus: true,
        showPlanes: RENDER_GROUND
    });
  document.body.appendChild(arDebug.getElement()); //re-enable this to turn on the debugger, do we even need it anymore???
  
  
  // Setup the three.js rendering environment
  renderer = new THREE.WebGLRenderer({ alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClear = false;
  canvas = renderer.domElement;
  canvas.id = "video";
  document.body.appendChild(canvas);

  canvasOverlay = document.getElementById("canvasOverlay");
  canvasOverlay.width = SCREEN_WIDTH;
  canvasOverlay.height = SCREEN_HEIGHT;
  

  // Creating the ARView, which is the object that handles
  // the rendering of the camera stream behind the three.js
  // scene
  arView = new THREE.ARView(vrDisplay, renderer);

  // The ARPerspectiveCamera is very similar to THREE.PerspectiveCamera,
  // except when using an AR-capable browser, the camera uses
  // the projection matrix provided from the device, so that the
  // perspective camera's depth planes and field of view matches
  // the physical camera on the device.
  camera = new THREE.ARPerspectiveCamera(
    vrDisplay,
    60,
    window.innerWidth / window.innerHeight,
    vrDisplay.depthNear,
    vrDisplay.depthFar
  );

  // VRControls is a utility from three.js that applies the device's
  // orientation/position to the perspective camera, keeping our
  // real world and virtual world in sync.
  vrControls = new THREE.VRControls(camera);

  truckMesh = createTruckPrimitive();

  // Place the cube very far to initialize
  truckMesh.position.set(10000, 10000, 10000);
  truckMesh.scale.set(0.5, 0.5, 0.5); //set the scale to half the truck, for easier debugging
  scene.add(truckMesh);
  
  // Bind our event handlers
  window.addEventListener('resize', onWindowResize, false);
  canvas.addEventListener('touchstart', onClick, false);
  canvasOverlay.addEventListener('touchstart', onClick, false);
  

    // Logs the addition of the first discovered plane and creates a mesh to use as the ground, places it overlapping the initial plane
  debug("Searching for a plane. . .");
  vrDisplay.addEventListener('planesadded', e => {
      debug(`Planes added for ${e.display}`);

      groundPlane = null;
      debug("Creating ground plane mesh. . .");
      groundPlaneMesh = createPlane();
      debug("Mesh created succesfully");

      e.planes.forEach(plane => {
          /*debug(`
            Added plane ${plane.identifier} at ${plane.modelMatrix}, 
            with extent ${plane.extent} with vertices ${plane.vertices}
         `);*/
          debug("Plane found!");
          groundPlane = plane;
          updateGroundPlane(plane);
          
      });

  }, { once: true });

  vrDisplay.addEventListener('planesupdated', e => {
      e.planes.forEach(plane => {
          // Compares a newly updated plane to the current groundPlane. If it's larger, will update the position of the mesh
          if (groundPlane.identifier !== plane.identifier && plane.extent[0] * plane.extent[1] > groundPlane.extent[0] * groundPlane.extent[1]) {
              try {
                  updateGroundPlane(plane);
                  groundPlane = plane; //saves a global instance of the VRPlane we will use as the ground
                  debug(`Larger plane discovered, relocating ground mesh to plane id: ${plane.identifier}`);
              }
              catch (error) {
                  debug("Failed");
              }
          }
      });
  });
  drawPlateSeek();
  var axesHelper = new THREE.AxesHelper(50);
  scene.add(axesHelper);
  // Kick off the render loop!
  update();
  
}

/**
 * The render loop, called once per frame. Handles updating
 * our scene and rendering.
 */
function update() {
  // Clears color from the frame before rendering the camera (arView) or scene.
  renderer.clearColor();

  // Render the device's camera stream on screen first of all.
  // It allows to get the right pose synchronized with the right frame.
  arView.render();

  // Update our camera projection matrix in the event that
  // the near or far planes have updated
  camera.updateProjectionMatrix();

  if (openALPRReady)    // This is to execute the openALPR call at a specific time in the update function
  {                     // After the camera has been rendered onto the screen, and before the visual elements
      callALPR();           // So as to prevent the elements from being parsed to OpenALPR
      openALPRReady = false;
      
  }

  // Update our perspective camera's positioning
  vrControls.update();

  // Render our three.js virtual scene
  renderer.clearDepth();
  renderer.render(scene, camera);

  

  // Kick off the requestAnimationFrame to call this function
  // when a new VRDisplay frame is rendered
  vrDisplay.requestAnimationFrame(update);
    
}

/**
 * On window resize, update the perspective camera's aspect ratio,
 * and call `updateProjectionMatrix` so that we can get the latest
 * projection matrix provided from the device
 */
function onWindowResize () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * When clicking on the screen, fire a ray from where the user clicked
 * on the screen and if a hit is found, place a cube there.
 */


function onClick (e) {
    // If we don't have a touches object, abort
    if (!e.touches[0]) {
        return;
    }

    debug("touch");

    /*
    let panel = createDisplayPanel();
    panel.display("test");
    let ctx = panel.canvas.getContext("2d");
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, panel.canvas.width, panel.canvas.height);
    panel.texture.needsUpdate = true;
    debug("debug");
    */

    if (callStrokeWidthTransform())
    {
           //openALPRReady = true; // If enabled will call ALPR in the update function so that it avoids parsing bad data
    }

    truckBackPanel = createVerticalPlane();
    
     //Casting a ray from screen
    //normalise input data to be between -1 and 1
    
    //let x = e.touches[0].pageX / window.innerWidth * 2 - 1;
    //let y = e.touches[0].pageY / window.innerHeight *-2 +1;

    placeObjectAtDistance(truckBackPanel, 10); 
}

function callALPR()
{
    var data = canvas.toDataURL();
    /* debugging canvas, kept for posterity
    var img = new Image();
    img.src = data;
    document.getElementById("imagedebug").appendChild(img);
    */
    debug("Promise called");
    $.when(OpenALPR().getNumberPlateFromImageData(data))
        .then(
        function (response) {
            // success, check response object
            // response.number = plate no
            // response.center = center point of number plate with x,y,normalX, normalY
            debug(`Number: ${response.number}`);
            debug(`Normalised screen position: x ${response.center.normalX} & y ${response.center.normalY}`);
            //placeObjectAtCast(response.center.normalX, response.center.normalY, truckMesh);

        },
        function (error) {
            //error
            debug("No numberplate detected");
            // Does this error object have any properties we could find useful?
        });
    debug("Promise created");

}

function callStrokeWidthTransform()
{

    let b_ctx = buffer.getContext('2d');

    // size of the region to search
    let width = PLATE_WIDTH_RATIO * PLATE_DRAW_RATIO;
    let height = PLATE_HEIGHT_RATIO * PLATE_DRAW_RATIO;

    // top left corner of the region on the screen
    if (!plateSeekRegion.x)
    {
        debug("There is no plateSeekObject");
        return false;
    }
    let offsetX = plateSeekRegion.x * 3; // 3 is the magic ratio of the screen innerWidth vs 
    let offsetY = plateSeekRegion.y * 3; // the resolution determined by the canvas object used in three.ar.js
    
    
    // set the buffer canvas to be the same size as the search region
    buffer.width = width * 3;
    buffer.height = height * 3;

    // draw the main canvas on our buffer one
    // drawImage(source, source_X, source_Y, source_Width, source_Height, 
    //  dest_X, dest_Y, dest_Width, dest_Height)
    b_ctx.drawImage(canvas, offsetX, offsetY, width * 3, height * 3,
        0, 0, buffer.width, buffer.height);
    // now call the callback with the dataURL of our buffer canvas
    let data = buffer.toDataURL('image/jpeg');
    let img = new Image();
    img.src = data;

    element = document.getElementById("imagedebug");
    if (element.childNodes.length > 0) {
        element.removeChild(element.childNodes[0]);
    }
    //element.appendChild(img); //debugger

    debug("Processing image");
    
    // Perform SWT algorithm here

    // Return true of text is detected, false if not
    debug("plate data found");
    return true;

}

function createDisplayPanel()
{
    let _canvas = document.createElement('canvas');
    _canvas.width = _canvas.height = DISPLAY_PANEL_RESOLUTION;
    let _texture = new THREE.CanvasTexture({ canvas: _canvas });
    _texture.premultiplyAlpha = true;
    let panel =
        {
            canvas: _canvas, // Make sure you set needsUpdate to true whenever you modify the canvas!
            texture: _texture,
            mesh: new THREE.Mesh(
                new THREE.PlaneGeometry(0.5, 0.5),
                new THREE.MeshBasicMaterial({ map: _texture, transparent: true })
            ),
            display: function (string) {
                // This method will eventually set the canvas so that it displays whatever text is entered
                debug(string);
                this.texture.needsUpdate = true;
            }
        };
    scene.add(panel.mesh);
    return panel;
    
}

function createPlane()
{
    //Generates a mesh of a plane and matches it over the existing groundPlane
    let mesh = new THREE.Mesh(
        new THREE.CircleGeometry(GROUND_SCALE, 32), // 32 being the number of segments.
        new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }) // A wireframe helps visualise the large mesh
    );

    mesh.material.transparent = !RENDER_GROUND; // Future proofing to turn off visual debugging
    if (mesh.material.transparent) { mesh.material.opacity = 0; }
    
    let rotation = new THREE.Matrix4();
    rotation.makeRotationX(- Math.PI / 2);
    mesh.applyMatrix(rotation);
    

    scene.add(mesh);
    debug("Mesh succesfully created.");
    return mesh;
}

function createTruckPrimitive()
{
    // Create the cube geometry and add it to the scene. Set the position
    // to (Infinity, Infinity, Infinity) so that it won't appear visible
    // until the first hit is found, and move it there
    var geometry = new THREE.BoxGeometry(TRUCK_MAX_WIDTH, TRUCK_MAX_HEIGHT, TRUCK_MAX_DEPTH);
    var faceIndices = ['a', 'b', 'c'];
    for (var i = 0; i < geometry.faces.length; i++) {
        var f = geometry.faces[i];
        for (var j = 0; j < 3; j++) {
            var vertexIndex = f[faceIndices[j]];
            f.vertexColors[j] = colors[vertexIndex];
        }
    }
    // Shift the cube geometry vertices upwards, so that the "pivot" of
    // the cube is at it's base. When the cube is added to the scene,
    // this will help make it appear to be sitting on top of the real-
    // world surface.
    geometry.translate(0, TRUCK_MAX_HEIGHT / 2, 0); // This line will require some tweaking as it helps us position the geometry internally
    var material = new THREE.MeshBasicMaterial({ vertexColors: THREE.VertexColors, transparent: true, opacity: 0.9 });

    let ring = new THREE.Mesh(
        new THREE.RingGeometry(9, 10, 32).translate(0, TRUCK_MAX_HEIGHT / 2, 0),
        new THREE.MeshBasicMaterial({ color: 0xf4f00c, transparent: true, opacity: 0.5 }) //
    );

    let rotation = new THREE.Matrix4();
    rotation.makeRotationX(- Math.PI / 2);
    ring.applyMatrix(rotation);

    return new THREE.Mesh(geometry, material).add(ring);

}

function createVerticalPlane() {

    let mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1), // 32 being the number of segments.
        new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }) // A wireframe helps visualise the large mesh
    );

    
    scene.add(mesh);
    return mesh;
}

function drawPlateSeek()
{
    
    let ctx = canvasOverlay.getContext("2d");
    
    let width = PLATE_WIDTH_RATIO * PLATE_DRAW_RATIO;
    let height = PLATE_HEIGHT_RATIO * PLATE_DRAW_RATIO;


    let offsetX = canvasOverlay.width / 2 - width / 2;
    let offsetY = canvasOverlay.height / 3 * 2 - height / 2 - (window.screen.height - window.innerHeight); // position the plate finder 2/3 down the side of the page

    plateSeekRegion = { x: offsetX, y: offsetY };

    ctx.lineWidth = "4";
    ctx.strokeStyle = PLATE_DRAW_COLOUR;
    ctx.rect(offsetX, offsetY, width, height);
    ctx.stroke();
    let armLength = 16;
    ctx.clearRect(offsetX + armLength, offsetY - armLength, width - 2 * armLength, height + 2 * armLength); 
    ctx.clearRect(offsetX - armLength, offsetY + armLength, width + 2 * armLength, height - 2 * armLength); 
}

function clearPlateSeek()
{
    let ctx = canvasOverlay.getContext("2d");
    ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
}

function updateGroundPlane(plane)
{
    groundPlaneMesh.name = `plane-${plane.identifier}`;
    let matrix = new THREE.Matrix4();
    matrix.fromArray(plane.modelMatrix); //creates a new matrix and transposes it onto our current object, moving it accordingly
    groundPlaneMesh.applyMatrix(matrix);

}

function placeObjectAtCast( normalx, normaly, object)
{
    // x and y are normalised values between -1 and 1 that mimic the screen position to cast the ray from
    // object is the 3D model to place at the returned coordinates
    if (groundPlaneMesh === undefined) {
        debug("Initial ground plane isn't yet initialised!");
        return;
    }

    // Initialise the raycaster object
    var raycaster = new THREE.Raycaster();
    var coords = new THREE.Vector2( normalx, normaly );
    raycaster.setFromCamera(coords, camera);

    // Get 3D coords by casting the ray
    var intersect = raycaster.intersectObject(groundPlaneMesh);

    if (intersect.length === 0) { // Breaks the function if no the raycast returns empty
        debug(`No intersects found projecting a ray at ${normalx},${normaly} from point ${camera.matrix}`);
        return;
    }
    debug(`Found local point x:${intersect[0].point.x}, y:${intersect[0].point.y}, z:${intersect[0].point.z}, moving object`);

    // Move the object to 3D coords
    object.position.set(intersect[0].point.x, intersect[0].point.y, intersect[0].point.z);

    // Rotate the 3D object
    var angle = Math.atan2(
        camera.position.x - object.position.x,
        camera.position.z - object.position.z
    );
    object.rotation.set(0, angle, 0);

}

function placeObjectAtDistance(object, distance) {
    // moves an object to be at a point in front of the user's pose, a set distance away from the user.
    // object is the 3D model to place at the desired coordinates
    // distance is used to placed the object at a predefined distance from the pose
    object.position.copy(camera.position);
    debug(`ObjectOld:${object.position.x.toFixed(2)},${object.position.y.toFixed(2)},${object.position.z.toFixed(2)}`);
    debug(`CameraRot:${camera.rotation.x.toFixed(2)},${camera.rotation.y.toFixed(2)},${camera.rotation.z.toFixed(2)}`);


    // Move the object forward in a direction based on the camera's current direction
    
    
    var matrix = new THREE.Matrix4();
    matrix.extractRotation(camera.matrix);
    var axis = new THREE.Vector3();
    axis.applyMatrix4(matrix);
    object.translateOnAxis(axis.normalize(), distance);

    // Rotate the 3D object
    var angle = Math.atan2(
        camera.position.x - object.position.x,
        camera.position.z - object.position.z
    );
    object.rotation.set(0, angle, 0);

    debug(`ObjectNew:${object.position.x.toFixed(2)},${object.position.y.toFixed(2)},${object.position.z.toFixed(2)}`);

}

function test() {
    debug("test");
    //it just prints 'test'
}


/* ======================================================================
   CONTROL
   ====================================================================== */

$(document).ready(
    function () {

        debug("LoadAR start");

        // initialize AR stuff
        init();

});
