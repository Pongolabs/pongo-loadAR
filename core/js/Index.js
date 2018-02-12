
/* ==========================================================================
   COMMON FUNCTIONS
   ========================================================================== */

function debug(message) {

    if (console) {
       console.log(message);
    }

    var text = $("#debug").text();
    $("#debug").text(text + message + "\n");
    $("#debug")[0].scrollTop = $("#debug")[0].scrollHeight; 
}

$(".button-touch").unbind("touchstart").bind("touchstart", function (event) {

    var element = $(event.currentTarget);
    element.addClass("touch-highlight");

    //var click = document.getElementById('audio-click');
    //click.play();

    setTimeout(function () {
        element.removeClass("touch-highlight");
    }, 250);

});


/* ==========================================================================
   three.js STUFF
   ========================================================================== */

THREE.ARUtils.getARDisplay().then(function (display) {

    debug("LoadAR: THREE.ARUtils.getARDisplay");
    /**
     * Use the `getARDisplay()` utility to leverage the WebVR API
     * to see if there are any AR-capable WebVR VRDisplays. Returns
     * a valid display if found. Otherwise, display the unsupported
     * browser message.
     */
  
    if (display) 
    {
        AR_SUPPORTED = true;
        if (!app) {
            app = new LoadAR();
        }
        app.vrDisplay = display;
    } 
    else 
    {
        //THREE.ARUtils.displayUnsupportedMessage();
        AR_SUPPORTED = false;
        debug("LoadAR: AR not supported on this browser/device");
        // show error message
    }
});

/* ==========================================================================
   STATE ROUTES
   ========================================================================== */

sammy = Sammy('body', function () {

    this.get('#/x', function ()
    {
        app.setState("splash");
    });

    this.get('#/d', function ()
    {
        app.setState("detect");
    });

    this.get('#/v', function ()
    {
        var registrationNumber = "XXX000"; // dummy for demo
        app.setState("view", registrationNumber);
    });

    this.get('#/v/:registrationNumber', function ()
    {
        var registrationNumber = (this.params['registrationNumber']);
        app.setState("view", registrationNumber);
    });

    // default route
    this.notFound = function () {
        app.setState("splash");
    }

});


/* ==========================================================================
   APPLICATION START
   ========================================================================== */

$(document).ready(
    function () {
        debug("LoadAR: document ready");

        if (!app) {
            app = new LoadAR();
        }

        // run state machine
        sammy.run();

});