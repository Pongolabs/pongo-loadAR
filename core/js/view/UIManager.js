/* 
*   UIManager
*
*   This class is responsible for rendering the UI and handling UI events
*
*   (c) Pongolabs 2018
*/

function UIManager() {

    var _ = this;
    var parent;

    // local copy of parent data model
    var model;
    _.model = model;

    _.init = function (model) {
        debug("UIManager.init:");

        _.model = model;
    }

    _.wireUpEvents = function () {
        debug("UIManager.wireUpEvents:");

        if (Modernizr.touch) {

            $(".button-touch").unbind("touchstart").bind("touchstart", function (event) {

                var element = $(event.currentTarget);
                element.addClass("touch-highlight");

                //var click = document.getElementById('audio-click');
                //click.play();

                setTimeout(function () {
                    element.removeClass("touch-highlight");
                }, 250);

            });
        }
        else 
        {
            $(".button-touch").unbind("mousedown").bind("mousedown", function (event) {

                var element = $(event.currentTarget);
                element.addClass("touch-highlight");

                //var click = document.getElementById('audio-click');
                //click.play();

                setTimeout(function () {
                    element.removeClass("touch-highlight");
                }, 250);

            });
        }
    }

    _.render = function ()
    {
        debug("UIManager.render: ");
    }

}