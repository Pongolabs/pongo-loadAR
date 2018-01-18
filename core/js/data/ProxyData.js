/* 
*   ProxyData
*
*   This class is responsible for loading/posting data.
*
*   (c) Pongolabs 2018
*/

function ProxyData() {

    var _ = this;
    var parent;

    _.init = function (model) {
        debug("ProxyData.init:");

    }

    _.doLoadData = function () {
        debug("ProxyData.doLoadData:");

        // TODO complete

        $.ajax({
            type: 'POST',
            url: APP_ROOT_URL + APP_FOLDER_NAME + "core/loadData.aspx",
            data: {},
            success: function (response) {
                var object = jQuery.parseJSON(response);

            },
            error: function () {
                debug("ProxyData.doLoadData: error");
            }
        });
    }

}