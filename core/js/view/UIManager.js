/* 
*   UIManager
*
*   This class is responsible for rendering the UI and handling UI events
*
*   (c) Pongolabs 2018
*/

function UIManager() {

    var _ = this;


    _.init = function (model) {
        debug("UIManager.init:");
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

        document.getElementById("footer-button-center").removeEventListener('click', app.onFooterButtonClick);
        document.getElementById("footer-button-center").addEventListener('click', app.onFooterButtonClick);

        document.getElementById("footer-button-right").removeEventListener('click', app.onFooterButtonRightClick);
        document.getElementById("footer-button-right").addEventListener('click', app.onFooterButtonRightClick);

    }

    _.render = function ()
    {
        debug("UIManager.render: ");
        _.applyGlobalStateToContainer();

    }

    _.applyGlobalStateToContainer = function ()
    {
        debug("UIManager.applyGlobalStateToContainer: ");

        // apply global state flags to container element
        // this enables us to use CSS switches to do rendering
        $("#container").attr("data-ground-plane-found", GROUND_PLANE_FOUND)
        $("#container").attr("data-plate-found", PLATE_FOUND)

    }

    _.showNotification = function (notificationMessage)
    {
        debug("UIManager.showNotification: ");

        $("#notification").html(notificationMessage);
        $("#notification").fadeIn();
    }

    _.hideNotification = function ()
    {
        debug("UIManager.hideNotification: ");

        $("#notification").fadeOut();
    }

    return _;

}