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
    var nodes; // A collection of our object3Ds that are placed around the instance to designate various information as well as having usable functions
    var nodeDictionary = new Object(); // An object acting as a dictionary of nodes indexed using their unique id as a key
    var axesDisplay;
    var poseCache;
    var raycaster;

    var openALPRReady = false;
    var imageRecognitionRegion; //contains the x and y coords on the main canvas of the bounding box that designates where to search for plate info

    var buffer = document.createElement('canvas');
    var canvas;
    var canvasOverlay;

    var state;

    /* ==========================================================================
       INIT AND STATE CONTROL
       ========================================================================== */

    _.setState = function (state, arg0, arg1) {
        debug("LoadAR.setState: state " + state);

        // cache state
        _.state = state;

        // apply to DOM
        $("#container").attr("data-state", state);

        switch (_.state) {
            case "splash":
            {
                // splash screen with branding
                // move automatically to default afterwards
                setTimeout(function () {

                    $("#splash").fadeOut(700);

                    setTimeout(function () {
                        // go to the default state
                        _.gotoState("#/d");
                    }, 750);

                }, 1000);

                break;
            }

            case "detect":
            {
                // detect ground and license plate (with user input)
                if (!APP_INITIALIZED) app.initialize();
                _.drawCursor();
                _.update();
                
                break;
            }

            case "view":
            {
                // show delivery details and AR experience
                // overlaid on vehicle
                var registrationNumber = arg0;
                if (!APP_INITIALIZED) app.initialize();
                debug(`LoadAR.setState: Viewing plate: ${arg0}`);
                _.clearOverlay();
                _.drawCursor();
                
                if (_.poseCache.position.equals(new THREE.Vector3())) {
                    _.poseCache.copy(camera);
                }
                //debug(`PoseCh:${_.poseCache.rotation.x},${_.poseCache.rotation.y},${_.poseCache.rotation.z}`);
                //debug(`Camera:${_.camera.rotation.x},${_.camera.rotation.y},${_.camera.rotation.z}`);
                
                _.placeObjectAtDistance(_.truckBackPanel, 1.6);
                if (_.groundPlaneMesh !== null) {
                    _.truckBackPanel.position.setY(_.groundPlaneMesh.position.y + TRUCK_BACK_SIZE/2);
                }
                _.placeObjectAtDistance(new _.node(arg0), 1.55); // Set this a little short of the truck back panel, so the two don't intersect weirdly
                
                setTimeout(function () { _.checkAtCast(); }, VIEW_CAST_INTERVAL);
                _.update(); // Is this an issue if update loop is already running? Could cause problems
                

                // TODO: render AR UX

                

                break;
            }
        }
    };

    _.gotoState = function (route) {
        debug("LoadAR.gotoState: " + route);

        if (route !== sammy.getLocation()) {
            debug("LoadAR.gotoState: transitioning to " + route);
            setTimeout(function () {
                sammy.setLocation(route);
            }, 0);
            return true;
        }
        else {
            return false;
        }
    };

    _.initialize = function () {
        debug("LoadAR.initialize:");

        if (AR_SUPPORTED === true) {
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

            _.poseCache = new THREE.Object3D();
            _.scene.add(_.poseCache);
            /*
            var axesHelper = new THREE.AxesHelper(5);
            _.poseCache.add(axesHelper);*/

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

            _.groundPlaneMesh = null;
            _.truckBackPanel = _.createVerticalPlane(TRUCK_BACK_SIZE);

            var exclusionZone = new THREE.Mesh(
                new THREE.RingGeometry(EXCLUSION_ZONE_RADIUS, EXCLUSION_ZONE_RADIUS+EXCLUSION_ZONE_WIDTH, 16, 2, 0, Math.PI).rotateX(Math.PI / 2).translate(0, -1, 0),
                new THREE.MeshBasicMaterial({ color: 0xFF4D4E, transparent: true, opacity: 0.5, side: THREE.DoubleSide }) //
            );
            exclusionZone.add(
                new THREE.Mesh(
                    new THREE.PlaneGeometry(EXCLUSION_ZONE_RADIUS*2, EXCLUSION_ZONE_WIDTH).rotateX(Math.PI / 2).translate(0, -1, EXCLUSION_ZONE_WIDTH/2),
                    new THREE.MeshBasicMaterial({ color: 0xFF4D4E, transparent: true, opacity: 0.5, side: THREE.DoubleSide }) //
                )
            );
            exclusionZone.add( // @TODO: make this better
                new THREE.Mesh(
                    new THREE.CircleGeometry(EXCLUSION_ZONE_RADIUS, 16, 0, Math.PI).rotateX(Math.PI / 2).translate(0, -1, 0),
                    new THREE.MeshBasicMaterial({ color: 0xFF4D4E, wireframe: true, transparent: true, opacity: 0.5, side: THREE.DoubleSide }) //
                )
            );
            _.truckBackPanel.add(exclusionZone);

            debug("LoadAR.initialize: bind event handlers");

            // Bind our event handlers
            window.addEventListener('resize', _.onWindowResize, false);
            document.getElementById("footer-button-center").addEventListener('touchstart', _.onClick, false);
            

            // Logs the addition of the first discovered plane and creates a mesh to use as the ground, places it overlapping the initial plane
            debug("Searching for a plane. . .");
            _.vrDisplay.addEventListener('planesadded', e => {
                debug(`Planes added for ${e.display}`);

                _.groundPlane = null;
                debug("Creating ground plane mesh. . .");
                _.groundPlaneMesh = _.createPlane();
                _.groundPlaneMesh.visible = false;
                debug("Mesh created succesfully");

                e.planes.forEach(plane => {
                    /*debug(`
                    Added plane ${plane.identifier} at ${plane.modelMatrix}, 
                    with extent ${plane.extent} with vertices ${plane.vertices}
                    `);*/
                    debug("Plane found!");
                    _.groundPlane = plane;
                    _.extendGroundPlane(plane);

                });

            }, { once: true });

            _.vrDisplay.addEventListener('planesupdated', e => {
                e.planes.forEach(plane => {
                    // Compares a newly updated plane to the current groundPlane. If it's larger, will update the position of the mesh
                    if (_.groundPlane.identifier !== _.plane.identifier && _.plane.extent[0] * plane.extent[1] > _.groundPlane.extent[0] * _.groundPlane.extent[1]) {
                        try {
                            _.extendGroundPlane(plane);
                            _.groundPlane = plane; //saves a global instance of the VRPlane we will use as the ground
                            debug("Larger plane discovered, relocating ground mesh to plane id: ${plane.identifier}");
                        }
                        catch (error) {
                            debug("Failed");
                        }
                    }
                });
            });
            //_.drawCursor();

            // Initialise the raycaster object
            raycaster = new THREE.Raycaster();


            // Initialise the nodes array
            _.nodes = [];
        }

        // set global flag
        APP_INITIALIZED = true;
        debug("LoadAR.initialize: success");

    };

    /* ==========================================================================
       AR/3D FUNCTIONS 
       ========================================================================== */

    _.update = function () {
        //debug("LoadAR.update:"); //spews too much info into the debugger

        if (AR_SUPPORTED === true) {
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
            _.renderer.render(_.scene, _.camera);
            

            // Kick off the requestAnimationFrame to call this function
            // when a new VRDisplay frame is rendered
            _.vrDisplay.requestAnimationFrame(_.update);
        }
    };

    _.createDisplayPanel = function () {
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
    };

    _.createPlane = function () {
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
    };

    _.createTruckPrimitive = function () {
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

    };

    _.createVerticalPlane = function (size) {
        debug("LoadAR.createVerticalPlane:");
        // radius of a ring is size * root 2 over 2 to give an square's length of 2
        var x = size * Math.SQRT2 / 2;

        let mesh = new THREE.Mesh(
            new THREE.RingGeometry(x-EXCLUSION_ZONE_WIDTH, x, 4, 4, Math.PI/4), // 32 being the number of segments.
            new THREE.MeshBasicMaterial({ color: 0xFFB800, transparent: true, opacity: 0.5, side: THREE.FrontSide }) // A wireframe helps visualise the large mesh
        );
        mesh.add( new THREE.Mesh( // Occlusion mask
            new THREE.PlaneGeometry(size, size, 20, 20), 
            new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0, side: THREE.BackSide })
        ));
        mesh.position.set(10000, 10000, 10000);

        _.scene.add(mesh);
        return mesh;
    };

    _.extendGroundPlane = function (plane) {
        debug("LoadAR.extendGroundPlane:");

        _.groundPlaneMesh.name = `plane-${plane.identifier}`;
        let matrix = new THREE.Matrix4();
        matrix.fromArray(plane.modelMatrix); //creates a new matrix and transposes it onto our current object, moving it accordingly
        _.groundPlaneMesh.applyMatrix(matrix);

    };

    _.placeObjectAtCast = function (normalx, normaly, object) {
        debug("LoadAR.placeObjectAtCast:");

        // x and y are normalised values between -1 and 1 that mimic the screen position to cast the ray from
        // object is the 3D model to place at the returned coordinates
        if (_.groundPlaneMesh === undefined) {
            debug("LoadAR.placeObjectAtCast: Initial ground plane isn't yet initialised!");
            return;
        }

        

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

    };

    _.placeObjectAtDistance = function (object, distance) {
        debug("LoadAR.placeObjectAtDistance:");

        // moves an object to be at a point in front of the user's pose, a set distance away from the user.
        // object is the 3D model to place at the desired coordinates
        // distance is used to placed the object at a predefined distance from the pose

        //reset pose of object
        object.position.copy(_.poseCache.position);
        object.rotation.set(0, 0, 0);
        //debug(`ObjectOld:${object.position.x.toFixed(2)},${object.position.y.toFixed(2)},${object.position.z.toFixed(2)}`);
        debug(`LoadAR.placeObjectAtDistance: Camera rotation:${_.poseCache.getWorldRotation().x.toFixed(2)},${_.poseCache.getWorldRotation().y.toFixed(2)},${_.poseCache.getWorldRotation().z.toFixed(2)}`);

        // Move the object forward in a direction based on the camera's current direction
        var _vector = _.poseCache.getWorldDirection(new THREE.Vector3());
        _vector.y = 0;
        _vector.negate();
        _vector.normalize();
        debug(`${_vector.x},${_vector.y},${_vector.z}`);
        object.translateOnAxis(_vector, distance);
        
        debug(`LoadAR.placeObjectAtDistance: x: ${_vector.x.toFixed(2)}, y: ${_vector.y.toFixed(2)}, z: ${_vector.z.toFixed(2)}`);

        // Rotate the 3D object
        var angle = Math.atan2(
            _.poseCache.position.x - object.position.x,
            _.poseCache.position.z - object.position.z
        );
        object.rotation.set(0, angle, 0);

        //debug(`ObjectNew:${object.position.x.toFixed(2)},${object.position.y.toFixed(2)},${object.position.z.toFixed(2)}`);

    };

    function test() {
        debug("test");
        //it just prints 'test'
    }

    _.drawCursor = function () {
        debug("LoadAR.drawPlateSeek:");
        
        var ctx = _.canvasOverlay.getContext("2d");
        var width;
        var height;
        var offsetX;
        var offsetY;

        if (_.state === "detect" || _.state === "view")
        {
            if (_.state === "detect") {
                debug("LoadAR.drawPlateSeek: Cursor: Detect");
                width = PLATE_WIDTH_RATIO * PLATE_DRAW_RATIO;
                height = PLATE_HEIGHT_RATIO * PLATE_DRAW_RATIO;
                offsetX = _.canvasOverlay.width / 2 - width / 2;
                offsetY = _.canvasOverlay.height * 2 / 3 - height / 2 - (window.screen.height - window.innerHeight);

                _.imageRecognitionRegion = { x: offsetX, y: offsetY };

            } else if (_.state === "view") {
                debug("LoadAR.drawPlateSeek: Cursor: View");
                width = PLATE_DRAW_RATIO * 12;
                height = PLATE_DRAW_RATIO * 12;
                offsetX = _.canvasOverlay.width / 2 - width / 2;
                offsetY = _.canvasOverlay.height / 2 - height / 2 - (window.screen.height - window.innerHeight);

                _.imageRecognitionRegion = { x: offsetX, y: offsetY };
            }

            ctx.beginPath();
            ctx.lineWidth = "4";
            ctx.strokeStyle = PLATE_DRAW_COLOUR;
            ctx.rect(offsetX, offsetY, width, height);
            ctx.stroke();
            let armLength = 16;
            ctx.clearRect(offsetX + armLength, offsetY - armLength, width - 2 * armLength, height + 2 * armLength);
            ctx.clearRect(offsetX - armLength, offsetY + armLength, width + 2 * armLength, height - 2 * armLength);
        }
        
    };

    _.clearOverlay = function () {
        debug("LoadAR.clearOverlay:");

        let ctx = _.canvasOverlay.getContext("2d");
        ctx.clearRect(0, 0, _.canvasOverlay.width, _.canvasOverlay.height);
    };

    _.updateNode = function (_node, _string) {
        // Stores the id of a node along with a string in a dictionary where the key to access it is the node's id
        nodeDictionary[_node.id] = _string;
        debug(`LoadAR.attachNode: Node id: ${_node.id} added with message ${_string}`);
    };

    _.node = function (string = 'Lorem ipsum dolor sit amet') {
        var spriteMap = new THREE.TextureLoader();
        var _symbol = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteMap.load("../core/img/i_exclam_white.png"), color: 0xffffff, opacity: 1, transparent: true }));
        var spriteMaterial = new THREE.SpriteMaterial({ map: spriteMap.load("../core/img/ball2.png"), color: COLOUR_NODE_WARNING, opacity: 0.4 , transparent: true});
        var _node = new THREE.Sprite(spriteMaterial);
        _node.scale.multiplyScalar(0.15);
        _node.add(_symbol);  
        _.scene.add(_node);
        _.updateNode(_node, string);
        _.nodes.push(_node);
        debug(`Added node: ${_.nodes.length}`);
        return _node;
    };

    _.checkAtCast = function () {

        setTimeout(function () { _.checkAtCast(); }, VIEW_CAST_INTERVAL);
        raycaster.setFromCamera(new THREE.Vector2(0,0.15), _.camera);
        var intersect = raycaster.intersectObjects(_.nodes,false);
        if (intersect.length === 0) { // Breaks the function if the raycast returns empty
            debug(`LoadAR.checkAtCast: Nothing found`);
            return;
        }
        debug(`LoadAR.checkAtCast:${nodeDictionary[intersect[0].object.id]}`);
        
    };

    /* ==========================================================================
       EVENT HANDLERS
       ========================================================================== */

    _.onWindowResize = function () {
        debug("LoadAR.onWindowResize:");

        /**
            * On window resize, update the perspective camera's aspect ratio,
            * and call `updateProjectionMatrix` so that we can get the latest
            * projection matrix provided from the device
            */

        _.camera.aspect = window.innerWidth / window.innerHeight;
        _.camera.updateProjectionMatrix();
        _.renderer.setSize(window.innerWidth, window.innerHeight);
    };

    _.onClick = function (e) {
        debug(`LoadAR.onClick: ${_.state}`);

        // If we don't have a touches object, abort
        if (!e.touches[0]) {
            return;
        }
        switch (_.state) {
            case "detect":
                {
                    var condition = true;
                    //var condition = _.callStrokeWidthTransform();

                    if (condition) // conditional should optimally depend on the software automatically determining it is finding a plate, presently it happens on a user action
                    {
                        debug("LoadAR.onClick: Calling OpenALPR");
                        //_.openALPRReady = true; // If enabled will call ALPR in the update function so that it avoids parsing bad data
                        _.poseCache.copy(_.camera);

                        _.gotoState("#/v/" + "PONGO1");

                    }
                    break;
                }

            case "view":
                {
                    break;
                }
        }
    };

    /* ==========================================================================
       OPENALPR LICENSE PLATE RECOGNITION
       ========================================================================== */

    _.callALPR = function () {
        debug("LoadAR.callALPR:");

        var data = _.canvas.toDataURL();
        /* debugging canvas, kept for posterity
        var img = new Image();
        img.src = data;
        document.getElementById("imagedebug").appendChild(img);
        */
        debug("LoadAR.callALPR: Promise created");
        $.when(OpenALPR().getNumberPlateFromImageData(data))
            .then(
            function (response) {
                // success, check response object
                // response.center = center point of number plate with x,y,normalX, normalY
                debug(`OpenALPR: Detected Licence plate as ${response.number}`);
                //debug("Normalised screen position: x ${response.center.normalX} & y ${response.center.normalY}");

                // go to view state
                _.gotoState("#/v/" + response.number);
                
            },
            function (error) {
                //error
                debug("LoadAR.callALPR: No numberplate detected");
                // Does this error object have any properties we could find useful?
            });
    };

    /* ==========================================================================
       LICENSE PLATE DETECT (NOT OCR/RECOGNITION)
       ========================================================================== */

    _.callStrokeWidthTransform = function () {
        debug("LoadAR.callStrokeWidthTransform:");

        let b_ctx = _.buffer.getContext('2d');

        // size of the region to search
        let width = PLATE_WIDTH_RATIO * PLATE_DRAW_RATIO;
        let height = PLATE_HEIGHT_RATIO * PLATE_DRAW_RATIO;

        // top left corner of the region on the screen
        if (!_.imageRecognitionRegionRegion.x) {
            debug("There is no plateSeekObject");
            return false;
        }
        let offsetX = _.imageRecognitionRegion.x * 3; // 3 is the magic ratio of the screen innerWidth vs 
        let offsetY = _.imageRecognitionRegion.y * 3; // the resolution determined by the canvas object used in three.ar.js

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
    };

}