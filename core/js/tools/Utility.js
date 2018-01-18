/* 
*   Utility functions
*
*   (c) Pongolabs 2018
*/

function Utility() {

    var _ = this;

    _.getFileExtension = function (filename) {
        if (!filename) return "";
        var ext = filename.split('.').pop();
        if (ext == filename) return "";
        return ext;
    }

    _.generateGUID = function () {

        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
        });
        return uuid;
    }

    _.getRandomNumber = function (refresh) {

        if (Utility.randomNumber == null) Utility.randomNumber = Math.round(Math.random() * 1000);
        if (refresh == true) Utility.randomNumber = Math.round(Math.random() * 1000);

        return Utility.randomNumber;

        //return Math.round(Math.random() * 1000)
    }

    return _;
}
