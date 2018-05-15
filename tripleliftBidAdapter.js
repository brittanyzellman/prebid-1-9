import { BANNER } from 'src/mediaTypes';
import { registerBidder } from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';

const BIDDER_CODE = 'triplelift';
const STR_ENDPOINT = document.location.protocol + '//staging-tlx.3lift.com/header/auction?';
// const STR_ENDPOINT = '//staging-tlx.3lift.com/header/auction?';
var bid_index = 0;
var applies = true;
var consent_string = null;

export const tripleliftAdapterSpec = {

  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  aliases: ['triplelift'],
  isBidRequestValid: function(bid) {
    return !!(bid.params.inventoryCode);
  },

  buildRequests: function(bidRequests, bidderRequest) {
    var tlCall = STR_ENDPOINT;
    var referrer = utils.getTopWindowUrl();
    var data = _buildPostBody(bidRequests);

    tlCall = utils.tryAppendQueryString(tlCall, 'lib', 'prebid');
    tlCall = utils.tryAppendQueryString(tlCall, 'v', '$prebid.version$');
    tlCall = utils.tryAppendQueryString(tlCall, 'fe', _isFlashEnabled().toString());
    tlCall = utils.tryAppendQueryString(tlCall, 'referrer', referrer);

    if (typeof bidderRequest.gdprConsent.gdprApplies !== 'undefined') {
      applies = bidderRequest.gdprConsent.gdprApplies;
      tlCall = utils.tryAppendQueryString(tlCall, 'gdpr', applies.toString());
    }
    if (!!bidderRequest.gdprConsent.consentString) {
      consent_string = bidderRequest.gdprConsent.consentString;
      tlCall = utils.tryAppendQueryString(tlCall, 'cmp_cs', consent_string);
    }
    if (tlCall.lastIndexOf('&') === tlCall.length - 1) {
      tlCall = tlCall.substring(0, tlCall.length - 1);
    }
    utils.logMessage('tlCall request built: ' + tlCall);

    return {
      method: 'POST',
      url: tlCall,
      data,
      bidderRequest
    };
  },

  interpretResponse: function(serverResponse, {bidderRequest}) {
    var bidResponses = [];
    var bids = serverResponse.body.bids || [];

    // will serverResponse be an object of objects?
    // bids is an array of objects?
    if (bids.length > 0) {
      for (let i = 0; i < bids.length; i++) {
        bidResponses.push(_buildResponseObject(bidderRequest, bids[i]));
      }
    }
    return bidResponses;
  },

  getUserSyncs: function(syncOptions) {
    var ibCall = '//ib.3lift.com/userSync.html';
    if (consent_string !== null) {
      ibCall = utils.tryAppendQueryString(ibCall, 'gdpr', applies);
      ibCall = utils.tryAppendQueryString(ibCall, 'cmp_cs', consent_string);
    }

    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: ibCall
      }];
    }
  }
}

function _buildPostBody(bidRequests) {
  var data = {imp: []};
  var idx = 0;

  for (let i = 0; i < bidRequests.length; i++) {
    data.imp.push(
      {
        id: i,
        tagid: bidRequests[i].params.inventoryCode,
        floor: bidRequests[i].params.floor,
        banner: {
          format: _sizes(bidRequests[i].sizes),
        },
      }
    )
  }
  return data;
}

function _sizes(sizeArray) {
  var format = [];
  for (let i = 0; i < sizeArray.length; i++) {
    format.push({
      w: sizeArray[i][0],
      h: sizeArray[i][1]
    });
  }
  return format;
}

function _buildResponseObject(bidderRequest, bid) {
  var width = bid.width || 1;
  var height = bid.height || 1;
  var dealId = bid.deal_id || '';
  var creativeId = bid.imp_id;

  if (bid.cpm != 0 && bid.ad) {
    const bidResponse = {
      requestId: bidderRequest.bids[creativeId].bidId,
      cpm: bid.cpm,
      width: width,
      height: height,
      netRevenue: true,
      ad: bid.ad,
      creativeId: creativeId,
      dealId: dealId,
      currency: 'USD',
      ttl: 33,
    };
    return bidResponse;
  };
}

function _isFlashEnabled() {
  var hasFlash = 0;
  try {
    var fo = new window.ActiveXObject('ShockwaveFlash.ShockwaveFlash');
    if (fo) { hasFlash = 1; }
  } catch (e) {
    if (navigator.mimeTypes &&
      navigator.mimeTypes['application/x-shockwave-flash'] !== undefined &&
      navigator.mimeTypes['application/x-shockwave-flash'].enabledPlugin) {
      hasFlash = 1;
    }
  }
  return hasFlash;
}

registerBidder(tripleliftAdapterSpec);
