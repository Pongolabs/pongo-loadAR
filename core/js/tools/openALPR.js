/* eslint */
/* global $, atob, FormData, Blob */

/**
 * PongoOpenALPR Adapter
 * Returns licence plate data.
 */
function OpenALPR () {
  // Adapters
  var adapters = {
    'retrievePlate': function (imageDataURL, successFunc, errorFunc) {
      return retrievePlate(imageDataURL, successFunc, errorFunc)
    },
    'getNumberPlateFromImageData': function (data) {
      return getNumberPlateFromImageData(data)
    }
  }

  /*
    Get number plate from image and geometrical info
  */
  var getNumberPlateFromImageData = function(data) 
  {
        var d = new $.Deferred();

        // detect number plate
        OpenALPR().retrievePlate(data, 
            function(response) 
            {
                debug("LoadAR: OpenALPR success");
                //debug(response);

                if (!response.results || response.results.length === 0) 
                {
                    debug("Failed, no numberplate found");
                    return;
                }

                var result;
                var object = {};

                for (var key in response.results) {
                    result = response.results[key];

                    // get first results only
                    break;
                }

                if (result)
                {
                    // get plate number and coordinates
                    object.number = result.plate;
                                        
                    // get coordinates
                    if (result.coordinates && 
                        result.coordinates.length >= 4)
                    {
                        var centerX;
                        var centerY;

                        var point0 = result.coordinates[0];
                        var point1 = result.coordinates[1];
                        var point2 = result.coordinates[2];
                        var point3 = result.coordinates[3];

                        centerX = (point0.x + point1.x + point2.x + point3.x)/4;
                        centerY = (point0.y + point1.y + point2.y + point3.y)/4;

                        var imageWidth  = response.img_width;
                        var imageHeight  = response.img_height;

                        object.center = {x: centerX, y: centerY, normalX: (centerX-imageWidth/2)/(imageWidth/2), normalY: (centerY-imageHeight/2)/(imageHeight/2)}
                    }
                }
<<<<<<< HEAD

=======
                
>>>>>>> origin/master
                d.resolve(object);
            }, 
            function(error) 
            {
                //debug("LoadAR: OpenALPR error");
                //debug(error);

                d.reject(error);

            });

      return d;
  }

  /**
   * Retreive a licence plate number.
   * @param {ImageDataURL} imageDataURL ImageDataURL.
   * @param {Function} successFunc Success function callback.
   * @param {Function} errorFunc Error function callback.
   * @return {jqXHR} jQuery XMLHttpRequest.
   * @public
   */
  var retrievePlate = function (imageDataURL, successFunc, errorFunc) {
    var blob = dataURItoBlob(imageDataURL)
    if (!blob) {
      console.error('PongoOpenALPR.dataURItoBlob: Invalid blob object')
      errorFunc()
    }
    var url = getCloudAPIUrl()
    var formData = new FormData()
    formData.append('image', blob)

    var options = {
      'method': 'POST',
      'url': url,
      'success': successFunc,
      'error': errorFunc,
      'contentType': false,
      'processData': false,
      'data': formData
    }
    return $.ajax(options)
  }

  /**
   * Get the REST endpoint for OpenALPR requests.
   * @return {string} URL for OpenALPR REST endpoint.
   * @private
   */
  var getCloudAPIUrl = function () {
    var cloudapiSecretKey = 'sk_3dfe81c805d13ce0d6535128'
    var country = 'au'
    var url = 'https://api.openalpr.com/v2/recognize?recognize_vehicle=1&country=' + country + '&secret_key=' + cloudapiSecretKey + '&return_image=false'
    return url
  }

  /**
   * Convert a dataURI to a Blob
   * @param {ImageDataURL} imageDataURL ImageDataURL.
   * @return {blob} Blob object.
   * @private
   */
  function dataURItoBlob (imageDataURL) {
    try {
      if (!imageDataURL) {
        console.error('PongoOpenALPR.dataURItoBlob: Invalid imageDataURL')
        return null
      }

     // convert base64/URLEncoded data component to raw binary data held in a string
      var byteString
      if (imageDataURL.split(',')[0].indexOf('base64') >= 0) {
        byteString = atob(imageDataURL.split(',')[1])
      } else {
        byteString = unescape(imageDataURL.split(',')[1])
      }

      // separate out the mime component
      var mimeString = imageDataURL.split(',')[0].split(':')[1].split(';')[0]

      // write the bytes of the string to a typed array
      var ia = new Uint8Array(byteString.length)
      for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }

      return new Blob([ia], {type: mimeString})
    } catch (e) {
      console.error('PongoOpenALPR.dataURItoBlob: Unable to parse imageDataURL')
      return null
    }
  }



  // Return adapters (must be at end of adapter)
  return adapters;
}

//window.exports = PongoOpenALPR
// End A (Adapter)