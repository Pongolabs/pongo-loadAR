/* 
*   Utility functions for image specific tasks
*
*   (c) Pongolabs 2018
*/

function UtilityImage() {

    var _ = this;
    var parent;

    _.calculateImageSizeToFitWithinRegion = function (imageW, imageH, regionW, regionH) {
        debug("UtilityImage.calculateImageSizeToFitWithinRegion:");

        var size = new Object();

        if (!imageW) return size;
        if (!imageH) return size;
        if (!regionW) return size;
        if (!regionH) return size;

        if ((imageW / imageH) > (regionW / regionH)) {

            // WIDE image LANDSCAPE
            size.width = regionW;
            size.height = Math.floor((imageH / imageW) * regionW);

        }
        else {

            // TALL image PORTRAIT
            size.height = regionH;
            size.width = Math.floor((imageW / imageH) * regionH);
        }

        return size;
    }

    return _;

}
