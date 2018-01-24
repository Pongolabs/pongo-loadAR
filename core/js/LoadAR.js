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

var vrDisplay;
var vrControls;
var arView;

var canvas;
var camera;
var scene;
var renderer;
var truckMesh; //the 3D cube used to represent the truck in the 3D space
var groundPlane; // global container for the first discovered plane object
var groundPlaneMesh; // represents the 3DPlane in the worldspace
var cursor;


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

var TRUCK_MAX_WIDTH = 2.5;
var TRUCK_MAX_HEIGHT = 4;
var TRUCK_MAX_DEPTH = 12.5;
var GROUND_SCALE = 10; //the factor by which to multiply the initial ground plane
var RENDER_GROUND = true; // toggle rendering planes or not as a 3D object for debugging

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
    scene = new THREE.Scene();
    var arDebug = new THREE.ARDebug(vrDisplay, scene, {
        showLastHit: true,
        showPoseStatus: true,
        showPlanes: RENDER_GROUND
    });
  document.body.appendChild(arDebug.getElement());
  
  // Setup the three.js rendering environment
  renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClear = false;
  canvas = renderer.domElement;
  document.body.appendChild(canvas);
  

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

  
  // Create the cube geometry and add it to the scene. Set the position
  // to (Infinity, Infinity, Infinity) so that it won't appear visible
  // until the first hit is found, and move it there
  var geometry = new THREE.BoxGeometry(TRUCK_MAX_WIDTH, TRUCK_MAX_HEIGHT, TRUCK_MAX_DEPTH);
  var faceIndices = ['a', 'b', 'c'];
  for (var i = 0; i < geometry.faces.length; i++) {
    var f  = geometry.faces[i];
    for (var j = 0; j < 3; j++) {
      var vertexIndex = f[faceIndices[ j ]];
      f.vertexColors[j] = colors[vertexIndex];
    }
  }
  // Shift the cube geometry vertices upwards, so that the "pivot" of
  // the cube is at it's base. When the cube is added to the scene,
  // this will help make it appear to be sitting on top of the real-
  // world surface.
  // geometry.applyMatrix( new THREE.Matrix4().setTranslation( 0, BOX_SIZE / 2, 0 ) );
  geometry.translate( 0, TRUCK_MAX_HEIGHT / 2, 0 );
  var material = new THREE.MeshBasicMaterial({ vertexColors: THREE.VertexColors });
  truckMesh = new THREE.Mesh(geometry, material);
    

  // Place the cube very far to initialize
  truckMesh.position.set(10000, 10000, 10000);
  truckMesh.scale.set(0.5, 0.5, 0.5); //set the scale to half the truck, for easier debugging
  scene.add(truckMesh);

  // Raycast debugger object SCHEDULED FOR DELETE
    /*
   cursor = new THREE.Mesh(
      new THREE.CubeGeometry(0.1, 0.3, 0.2), // Plane.extent is an x & y bounding box of the VRPlane
      new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: false }) // A wireframe of 4*4 helps visualise the large mesh
  );
   scene.add(cursor); */
  
    

  // Bind our event handlers
  window.addEventListener('resize', onWindowResize, false);
  canvas.addEventListener('touchstart', onClick, false);

    // Logs the addition of the first discovered plane and creates a mesh to use as the ground, places it overlapping the initial plane
  debug("Searching for a plane. . .");
  vrDisplay.addEventListener('planesadded', e => {
      debug(`Planes added for ${e.display}`);

      groundPlane = null;
      debug("Creating ground plane mesh. . .");
      groundPlaneMesh = createPlane();
      debug("Mesh created succesfully");

      e.planes.forEach(plane => {
          debug(`
            Added plane ${plane.identifier} at ${plane.modelMatrix}, 
            with extent ${plane.extent} with vertices ${plane.vertices}
         `);
          groundPlane = plane;
          updateGroundPlane(plane);
          
      });

  }, { once: true });
  debug("test complete");

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
    // TODO: is this necessary?
    if (!e.touches[0]) {
        return;
    }

    debug("touch");
  
    var x = e.touches[0].pageX / window.innerWidth *2 -1;
    var y = e.touches[0].pageY / window.innerHeight *-2 +1;

    debug(`Casting a ray from ${x},${y}`);
    placeObjectAtCast(0, 0, truckMesh);

    /** REMOVED BY AIDAN to test a different onClick function SCHEDULED FOR DELETE
    This onClick moves the spawned box to our 'hit' matrix returned by a raytrace, taken from ARCore examples

  // Inspect the event object and generate normalize screen coordinates
  // (between 0 and 1) for the screen position.
  

  // Send a ray from the point of click to the real world surface
  // and attempt to find a hit. `hitTest` returns an array of potential
  // hits.
  var hits = vrDisplay.hitTest(x, y);

  // If a hit is found, just use the first one
  if (hits && hits.length) {
    var hit = hits[0];
    // Use the `placeObjectAtHit` utility to position
    // the cube where the hit occurred
    THREE.ARUtils.placeObjectAtHit(cube,  // The object to place
                                   hit,   // The VRHit object to move the cube to
                                   1,     // Easing value from 0 to 1; we want to move
                                          // the cube directly to the hit position
                                   false); // Whether or not we also apply orientation

  } */
}

function createPlane()
{
    //Generates a mesh of a plane and matches it over the existing groundPlane
    let mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1, 4, 4), // 
        new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }) // A wireframe of 4*4 helps visualise the large mesh
    );

    mesh.material.transparent = !RENDER_GROUND; // Future proofing to turn off visual debugging
    if (mesh.material.transparent) { mesh.material.opacity = 0; }
    
    let rotation = new THREE.Matrix4();
    rotation.makeRotationX(- Math.PI / 2);
    mesh.applyMatrix(rotation);

    mesh.scale.set(GROUND_SCALE, GROUND_SCALE, GROUND_SCALE);

    scene.add(mesh);
    debug("Mesh succesfully created.");
    return mesh;
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



/* ======================================================================
   CONTROL
   ====================================================================== */

$(document).ready(
    function () {

        debug("LoadAR start");

        // initialize AR stuff
        init();

});
