/* ==========================================================================
   MAIN APPLICATION OBJECT
   ========================================================================== */

function LoadAR() {

    var _ = this;

    var vrDisplay;
    var vrControls;
    var arView;
    var arDebug;
    var camera;
    var scene;
    var renderer;
    var truckMesh; //the 3D cube used to represent the truck in the 3D space
    var truckBackPanel;
    var groundPlane; // global container for the first discovered plane object
    var groundPlaneMesh; // represents the 3DPlane in the worldspace
    var displayPanel = []; // A collection of our object3Ds that are placed around the instance to designate various information as well as having usable functions
    var axesDisplay;

    var openALPRReady = false;
    var plateSeekRegion; //contains the x and y coords on the main canvas of the bounding box that designates where to search for plate info

    var buffer = document.createElement('canvas');
    var canvas;
    var canvasOverlay;

    /* ==========================================================================
       INIT AND STATE CONTROL
       ========================================================================== */

    _.setState = function (state, arg0, arg1)
    {
        debug("LoadAR.setState: state " + state);

        // apply to DOM
        $("#container").attr("data-state", state);

        switch (state)
        {
            case "splash":

                // splash screen with branding
                // move automatically to default afterwards
                setTimeout(function() {

                        $("#splash").fadeOut(700);

                        setTimeout(function() {
                            // go to the default state
                            _.gotoState("#/d");                            
                        }, 750);

                    }, 1000);

                break;

            case "detect": 

                // detect ground and license plate (with user input)
                if (!APP_INITIALIZED) app.initialize();
                _.update();

                break;

            case "view": 

                // show delivery details and AR experience
                // overlaid on vehicle
                var registrationNumber = arg0;
                if (!APP_INITIALIZED) app.initialize();
                _.update();

                break;

        }

    }

    _.gotoState = function (route)
    {
        debug("LoadAR.gotoState: " + route);

        if (route != sammy.getLocation()) {
            debug("LoadAR.gotoState: transitioning to " + route);
            setTimeout(function () {
                sammy.setLocation(route);
            },0);
            return true;
        }
        else
        {
            return false;
        }
    }

    _.initialize = function() 
    {
        debug("LoadAR.initialize:");    

        if (AR_SUPPORTED == true) 
        {
            debug("LoadAR.initialize: creating 3D/AR assets");  

            // Turn on the debugging panel
            // we may not actually need this
            _.scene = new THREE.Scene();

            _.arDebug = new THREE.ARDebug(_.vrDisplay, _.scene, {
                    //showLastHit: true,
                    showPoseStatus: true,
                    showPlanes: RENDER_GROUND
                });
            //document.body.appendChild(_.arDebug.getElement()); //re-enable this to turn on the debugger, do we even need it anymore??? // Aidan reenabled this to debug finding vertical planes

            

            // Setup the three.js rendering environment
            _.renderer = new THREE.WebGLRenderer({ alpha: true, preserveDrawingBuffer: true });
            _.renderer.setPixelRatio(window.devicePixelRatio);
            _.renderer.setSize(window.innerWidth, window.innerHeight);
            _.renderer.autoClear = false;
            _.canvas = _.renderer.domElement;
            _.canvas.id = "video";

            
            // add to DOM
            //document.body.appendChild(_.canvas);
            document.getElementById("container").appendChild(_.canvas);

            _.canvasOverlay = document.getElementById("canvasOverlay");
            _.canvasOverlay.width = SCREEN_WIDTH;
            _.canvasOverlay.height = SCREEN_HEIGHT;

 
            // Creating the ARView, which is the object that handles
            // the rendering of the camera stream behind the three.js
            // scene
            _.arView = new THREE.ARView(_.vrDisplay, _.renderer);

            // The ARPerspectiveCamera is very similar to THREE.PerspectiveCamera,
            // except when using an AR-capable browser, the camera uses
            // the projection matrix provided from the device, so that the
            // perspective camera's depth planes and field of view matches
            // the physical camera on the device.
            _.camera = new THREE.ARPerspectiveCamera(
                _.vrDisplay,
                60,
                window.innerWidth / window.innerHeight,
                _.vrDisplay.depthNear,
                _.vrDisplay.depthFar
            );

            // VRControls is a utility from three.js that applies the device's
            // orientation/position to the perspective camera, keeping our
            // real world and virtual world in sync.
            _.vrControls = new THREE.VRControls(_.camera);

            debug("LoadAR.initialize: create 3D models");  


            _.truckBackPanel = _.createVerticalPlane();
  
            debug("LoadAR.initialize: bind event handlers");  

            // Bind our event handlers
            window.addEventListener('resize', _.onWindowResize, false);
            _.canvas.addEventListener('touchstart', _.onClick, false);
            _.canvasOverlay.addEventListener('touchstart', _.onClick, false);
 
            // Logs the addition of the first discovered plane and creates a mesh to use as the ground, places it overlapping the initial plane
            debug("Searching for a plane. . .");
            _.vrDisplay.addEventListener('planesadded', e => {
                debug("Planes added for ${e.display}");

                _.groundPlane = null;
                debug("Creating ground plane mesh. . .");
                _.groundPlaneMesh = createPlane();
                debug("Mesh created succesfully");

                e.planes.forEach(plane => {
                    /*debug(`
                    Added plane ${plane.identifier} at ${plane.modelMatrix}, 
                    with extent ${plane.extent} with vertices ${plane.vertices}
                    `);*/
                    debug("Plane found!");
                    _.groundPlane = plane;
                    _.updateGroundPlane(plane);
          
                });

            }, { once: true });

            _.vrDisplay.addEventListener('planesupdated', e => {
                  e.planes.forEach(plane => {
                      // Compares a newly updated plane to the current groundPlane. If it's larger, will update the position of the mesh
                      if (_.groundPlane.identifier !== _.plane.identifier && _.plane.extent[0] * plane.extent[1] > _.groundPlane.extent[0] * _.groundPlane.extent[1]) {
                          try {
                              _.updateGroundPlane(plane);
                              _.groundPlane = plane; //saves a global instance of the VRPlane we will use as the ground
                              debug("Larger plane discovered, relocating ground mesh to plane id: ${plane.identifier}");
                          }
                          catch (error) {
                              debug("Failed");
                          }
                      }
                  });
              });

              _.drawPlateSeek();
              _.axesHelper = new THREE.AxesHelper(50);
              _.scene.add(_.axesHelper);
              

         }

        // set global flag
        APP_INITIALIZED = true;
        debug("LoadAR.initialize: success");

    }

    /* ==========================================================================
       AR/3D FUNCTIONS 
       ========================================================================== */

    _.update = function() 
    {
       //debug("LoadAR.update:"); //spews too much info into the debugger

        if (AR_SUPPORTED == true) 
        {
            /**
             * The render loop, called once per frame. Handles updating
             * our scene and rendering.
             */

          // Clears color from the frame before rendering the camera (arView) or scene.
          _.renderer.clearColor();

          // Render the device's camera stream on screen first of all.
          // It allows to get the right pose synchronized with the right frame.
          _.arView.render();

          // Update our camera projection matrix in the event that
          // the near or far planes have updated
          _.camera.updateProjectionMatrix();

          if (_.openALPRReady)    // This is to execute the openALPR call at a specific time in the update function
          {                     // After the camera has been rendered onto the screen, and before the visual elements
              _.callALPR();           // So as to prevent the elements from being parsed to OpenALPR
              _.openALPRReady = false;
      
          }

          // Update our perspective camera's positioning
          _.vrControls.update();

          // Render our three.js virtual scene
          _.renderer.clearDepth();
          _.renderer.render( _.scene, _.camera);

          // Kick off the requestAnimationFrame to call this function
          // when a new VRDisplay frame is rendered
          _.vrDisplay.requestAnimationFrame(_.update);
        }
    }

    _.createDisplayPanel = function()
    {
       debug("LoadAR.createDisplayPanel:");

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

        _.scene.add(panel.mesh);
        return panel;
    
    }

    _.createPlane = function ()
    {
        debug("LoadAR.createPlane:");

        // Generates a mesh of a plane and matches it over the existing groundPlane
        let mesh = new THREE.Mesh(
            new THREE.CircleGeometry(GROUND_SCALE, 32), // 32 being the number of segments.
            new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }) // A wireframe helps visualise the large mesh
        );

        mesh.material.transparent = !RENDER_GROUND; // Future proofing to turn off visual debugging
        if (mesh.material.transparent) { mesh.material.opacity = 0; }
    
        let rotation = new THREE.Matrix4();
        rotation.makeRotationX(- Math.PI / 2);
        mesh.applyMatrix(rotation);
    
        _.scene.add(mesh);
        debug("Mesh succesfully created.");
        return mesh;
    }

    _.createTruckPrimitive = function()
    {
        debug("LoadAR.createTruckPrimitive:");

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

    _.createVerticalPlane = function() {
        debug("LoadAR.createVerticalPlane:");

        let mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1, 20, 20), // 32 being the number of segments.
            new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }) // A wireframe helps visualise the large mesh
        );
        mesh.position.set(10000, 10000, 10000);

        _.scene.add(mesh);
        return mesh;
    }

    _.updateGroundPlane = function(plane)
    {
        debug("LoadAR.updateGroundPlane:");

        _.groundPlaneMesh.name = `plane-${plane.identifier}`;
        let matrix = new THREE.Matrix4();
        matrix.fromArray(plane.modelMatrix); //creates a new matrix and transposes it onto our current object, moving it accordingly
        _.groundPlaneMesh.applyMatrix(matrix);

    }


    _.placeObjectAtCast = function(normalx, normaly, object)
    {
        debug("LoadAR.placeObjectAtCast:");

        // x and y are normalised values between -1 and 1 that mimic the screen position to cast the ray from
        // object is the 3D model to place at the returned coordinates
        if (_.groundPlaneMesh === undefined) {
            debug("LoadAR.placeObjectAtCast: Initial ground plane isn't yet initialised!");
            return;
        }

        // Initialise the raycaster object
        var raycaster = new THREE.Raycaster();
        var coords = new THREE.Vector2( normalx, normaly );
        raycaster.setFromCamera(coords, _.camera);

        // Get 3D coords by casting the ray
        var intersect = raycaster.intersectObject(_.groundPlaneMesh);

        if (intersect.length === 0) { // Breaks the function if no the raycast returns empty
            debug(`LoadAR.placeObjectAtCast: No intersects found projecting a ray at ${normalx},${normaly} from point ${_.camera.matrix}`);
            return;
        }
        debug(`LoadAR.placeObjectAtCast: Found local point x:${intersect[0].point.x}, y:${intersect[0].point.y}, z:${intersect[0].point.z}, moving object`);

        // Move the object to 3D coords
        object.position.set(intersect[0].point.x, intersect[0].point.y, intersect[0].point.z);

        // Rotate the 3D object
        var angle = Math.atan2(
            _.camera.position.x - object.position.x,
            _.camera.position.z - object.position.z
        );
        object.rotation.set(0, angle, 0);

    }

    _.placeObjectAtDistance = function(object, distance) 
    {
        debug("LoadAR.placeObjectAtDistance:");

        // moves an object to be at a point in front of the user's pose, a set distance away from the user.
        // object is the 3D model to place at the desired coordinates
        // distance is used to placed the object at a predefined distance from the pose

        //reset pose of object
        object.position.copy(_.camera.position);
        object.rotation.set(0, 0, 0);
        //debug(`ObjectOld:${object.position.x.toFixed(2)},${object.position.y.toFixed(2)},${object.position.z.toFixed(2)}`);
        debug(`CameraRot:${_.camera.getWorldRotation().x.toFixed(2)},${_.camera.getWorldRotation().y.toFixed(2)},${_.camera.getWorldRotation().z.toFixed(2)}`);

        // Move the object forward in a direction based on the camera's current direction
        var _vector = _.camera.getWorldDirection(new THREE.Vector3());
        _vector.y = 0;
        _vector.normalize();
        
        object.translateOnAxis(_vector, distance);
        debug(`LoadAR.placeObjectAtDistance: x: ${_vector.x.toFixed(2)}, y: ${_vector.y.toFixed(2)}, z: ${_vector.z.toFixed(2)}`);

        // Rotate the 3D object
        var angle = Math.atan2(
            _.camera.position.x - object.position.x,
            _.camera.position.z - object.position.z
        );
        object.rotation.set(0, angle, 0);

        //debug(`ObjectNew:${object.position.x.toFixed(2)},${object.position.y.toFixed(2)},${object.position.z.toFixed(2)}`);

    }

    function test() {
        debug("test");
        //it just prints 'test'
    }

    _.drawPlateSeek = function()
    {
        debug("LoadAR.drawPlateSeek:");

        let ctx = _.canvasOverlay.getContext("2d");
    
        let width = PLATE_WIDTH_RATIO * PLATE_DRAW_RATIO;
        let height = PLATE_HEIGHT_RATIO * PLATE_DRAW_RATIO;

        let offsetX = _.canvasOverlay.width / 2 - width / 2;
        let offsetY = _.canvasOverlay.height * 2 / 3 - height / 2 - (window.screen.height - window.innerHeight);

        _.plateSeekRegion = { x: offsetX, y: offsetY };

        ctx.lineWidth = "4";
        ctx.strokeStyle = PLATE_DRAW_COLOUR;
        ctx.rect(offsetX, offsetY, width, height);
        ctx.stroke();
        let armLength = 16;
        ctx.clearRect(offsetX + armLength, offsetY - armLength, width - 2 * armLength, height + 2 * armLength); 
        ctx.clearRect(offsetX - armLength, offsetY + armLength, width + 2 * armLength, height - 2 * armLength); 
    }

    _.clearPlateSeek = function()
    {
        debug("LoadAR.clearPlateSeek:");

        let ctx = _.canvasOverlay.getContext("2d");
        ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
    }

    /* ==========================================================================
       EVENT HANDLERS
       ========================================================================== */

    _.onWindowResize = function() {
        debug("LoadAR.onWindowResize:");

        /**
            * On window resize, update the perspective camera's aspect ratio,
            * and call `updateProjectionMatrix` so that we can get the latest
            * projection matrix provided from the device
            */

        _.camera.aspect = window.innerWidth / window.innerHeight;
        _.camera.updateProjectionMatrix();
        _.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    _.onClick = function (e) 
    {
        debug("LoadAR.onClick:");

        // If we don't have a touches object, abort
        if (!e.touches[0]) {
            return;
        }
        

        /*
        let panel = createDisplayPanel();
        panel.display("test");
        let ctx = panel.canvas.getContext("2d");
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, panel.canvas.width, panel.canvas.height);
        panel.texture.needsUpdate = true;
        debug("debug");
        */
        let condition = true;
        //let condition = _.callStrokeWidthTransform();

        if (condition) // conditional should optimally depend on the software automatically determining it is finding a plate, presently it happens on a user action
        {
               //openALPRReady = true; // If enabled will call ALPR in the update function so that it avoids parsing bad data
        }
    
         //Casting a ray from screen
        //normalise input data to be between -1 and 1
    
        //let x = e.touches[0].pageX / window.innerWidth * 2 - 1;
        //let y = e.touches[0].pageY / window.innerHeight *-2 +1;

        _.placeObjectAtDistance(_.truckBackPanel, 1.6); 
    }

    /* ==========================================================================
       OPENALPR LICENSE PLATE RECOGNITION
       ========================================================================== */

    _.callALPR = function()
    {
        debug("LoadAR.callALPR:");

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
                //debug("Number: ${response.number}");
                //debug("Normalised screen position: x ${response.center.normalX} & y ${response.center.normalY}");
                //placeObjectAtCast(response.center.normalX, response.center.normalY, truckMesh);

            },
            function (error) {
                //error
                debug("LoadAR.callALPR: No numberplate detected");
                // Does this error object have any properties we could find useful?
            });

        debug("Promise created");

    }

    /* ==========================================================================
       LICENSE PLATE DETECT (NOT OCR/RECOGNITION)
       ========================================================================== */

    _.callStrokeWidthTransform = function()
    {
        debug("LoadAR.callStrokeWidthTransform:");

        let b_ctx = _.buffer.getContext('2d');

        // size of the region to search
        let width = PLATE_WIDTH_RATIO * PLATE_DRAW_RATIO;
        let height = PLATE_HEIGHT_RATIO * PLATE_DRAW_RATIO;

        // top left corner of the region on the screen
        if (!_.plateSeekRegion.x)
        {
            debug("There is no plateSeekObject");
            return false;
        }
        let offsetX = _.plateSeekRegion.x * 3; // 3 is the magic ratio of the screen innerWidth vs 
        let offsetY = _.plateSeekRegion.y * 3; // the resolution determined by the canvas object used in three.ar.js
    
        // set the buffer canvas to be the same size as the search region
        _.buffer.width = width * 3;
        _.buffer.height = height * 3;

        // draw the main canvas on our buffer one
        // drawImage(source, source_X, source_Y, source_Width, source_Height, 
        //  dest_X, dest_Y, dest_Width, dest_Height)
        b_ctx.drawImage(_.canvas, offsetX, offsetY, width * 3, height * 3,
            0, 0, _.buffer.width, _.buffer.height);
        // now call the callback with the dataURL of our buffer canvas
        let data = _.buffer.toDataURL('image/jpeg');
        let img = new Image();
        img.src = data;

        element = document.getElementById("imagedebug");
        if (element.childNodes.length > 0) {
            element.removeChild(element.childNodes[0]);
        }
        //element.appendChild(img); //debugger

        debug("LoadAR.callStrokeWidthTransform:Processing image");
    
        // Perform SWT algorithm here

        // Return true of text is detected, false if not
        debug("LoadAR.callStrokeWidthTransform: plate data found");
        return true;
    }

}