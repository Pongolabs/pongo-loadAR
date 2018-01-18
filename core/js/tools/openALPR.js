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
    }
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
  return adapters
}

//window.exports = PongoOpenALPR
// End A (Adapter)