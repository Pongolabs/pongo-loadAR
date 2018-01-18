/* 
*   ARManager
*
*   Main class for AR control.
*
*   (c) Pongolabs 2018
*/

function ARManager() {

    var _ = this;

    _.init = function (filename) {
        
         /**
         * Use the `getARDisplay()` utility to leverage the WebVR API
         * to see if there are any AR-capable WebVR VRDisplays. Returns
         * a valid display if found. Otherwise, display the unsupported
         * browser message.
         */
        THREE.ARUtils.getARDisplay().then(function (display) {
        if (display) 
        {
            vrDisplay = display;
           
            // initialize

            // Turn on the debugging panel
              var arDebug = new THREE.ARDebug(vrDisplay);
              document.body.appendChild(arDebug.getElement());

              // Setup the three.js rendering environment
              renderer = new THREE.WebGLRenderer({ alpha: true });
              renderer.setPixelRatio(window.devicePixelRatio);
              renderer.setSize(window.innerWidth, window.innerHeight);
              renderer.autoClear = false;
              canvas = renderer.domElement;
              document.body.appendChild(canvas);
              scene = new THREE.Scene();

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
              var geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
              var faceIndices = ['a', 'b', 'c'];
              for (var i = 0; i < geometry.faces.length; i++) {
                var f  = geometry.faces[i];
                for (var j = 0;  j < 3; j++) {
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
          } 
          else 
          {
              THREE.ARUtils.displayUnsupportedMessage();
          }});
    }

    _.update = function ()
    {
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
    }

    return _;
}

