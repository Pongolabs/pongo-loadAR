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
var cube; //currently obsolete
var groundPlane; // global container for the first discovered plane object
var groundPlaneMesh; //obsolete.. i think. I might use this later, will represent the 3DPlane in the worldspace


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

var BOX_SIZE = 0.2; //currently obsolete
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

  /*
  // Create the cube geometry and add it to the scene. Set the position
  // to (Infinity, Infinity, Infinity) so that it won't appear visible
  // until the first hit is found, and move it there
  var geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
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
  geometry.translate( 0, BOX_SIZE / 2, 0 );
  var material = new THREE.MeshBasicMaterial({ vertexColors: THREE.VertexColors });
  cube = new THREE.Mesh(geometry, material);
    

  // Place the cube very far to initialize
  cube.position.set(10000, 10000, 10000);
  scene.add(cube);
    */

  // Bind our event handlers
  window.addEventListener('resize', onWindowResize, false);
  canvas.addEventListener('touchstart', onClick, false);

    // Logs the addition of the first discovered plane
    
  vrDisplay.addEventListener('planesadded', e => {
      debug(`Planes added for ${e.display}`);
      e.planes.forEach(plane => {
          debug(`
            Added plane ${plane.identifier} at ${plane.modelMatrix}, 
            with extent ${plane.extent} with vertices ${plane.vertices}
         `);
         groundPlane = plane; //saves a global instance of the VRPlane we will use as the ground
         debug("Ground plane initialised, creating mesh.. ");

         

         try {
             createPlane( groundPlane );
             debug("Success");
         }
         catch (error) {
             debug("Failed");
         }
      });

  }, { once: true });

  
  
    

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
  
      debug(`
    Found plane ${groundPlane.identifier} 
  `);
  

    /** REMOVED BY AIDAN to test a different onClick function
    This onClick moves the spawned box to our 'hit' matrix returned by a raytrace, taken from ARCore examples

  // Inspect the event object and generate normalize screen coordinates
  // (between 0 and 1) for the screen position.
  var x = e.touches[0].pageX / window.innerWidth;
  var y = e.touches[0].pageY / window.innerHeight;

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

function createPlane(plane)
{
    //Generates a mesh of a plane and matches it over the existing groundPlane
    let mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(plane.extent[0], plane.extent[1], 4, 4), // Plane.extent is an x & y bounding box of the VRPlane
        new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }) // A wireframe of 4*4 helps visualise the large mesh
    );

    
    mesh.material.transparent = !RENDER_GROUND; // Future proofing to turn off visual debugging
    if (mesh.material.transparent) { mesh.material.opacity = 0; }

    let rotation = new THREE.Matrix4();
    rotation.makeRotationX(- Math.PI / 2);

    let matrix = new THREE.Matrix4();
    matrix.fromArray(plane.modelMatrix);
    matrix.multiply(rotation);
    mesh.applyMatrix(matrix);
    mesh.scale.set(GROUND_SCALE, GROUND_SCALE, GROUND_SCALE);

    mesh.name = `plane-${plane.identifier}`;
    scene.add(mesh);
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
