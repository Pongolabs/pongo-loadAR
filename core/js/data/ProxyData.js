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

    _.doLoadData = function (registrationNumber) {
        debug("ProxyData.doLoadData:");

        var d = new $.Deferred();

        $.ajax({
            type: 'POST',
            url: APP_ROOT_URL + APP_FOLDER_NAME + "core/DeliveryGetByVehicleRegistrationNumber.aspx",
            data: {registrationNumber: registrationNumber},
            success: function (response) {
                var object = jQuery.parseJSON(response);

                d.resolve(object);
            },
            error: function () {
                debug("ProxyData.doLoadData: error");

                d.reject(error);
            }
        });

        d.resolve(object);
    }

}