/**
 * InstaHelp API client — connects Vercel frontend to Google Apps Script backend.
 * Small reads use GET. Large payloads (registration media, updates) use POST with
 * text/plain to avoid CORS preflight and huge query strings.
 */
var InstaHelpAPI = (function() {
  'use strict';

  var POST_ACTIONS = {
    submitVendorApplication: true,
    updateVendor: true,
    updateStore: true,
    addProduct: true,
    updateProduct: true,
    bulkAddProducts: true,
    submitShowcaseForm: true
  };

  function getUrl() {
    return (window.INSTAHELP_CONFIG && window.INSTAHELP_CONFIG.apiUrl) || '';
  }

  function parseResponse(res) {
    return res.text().then(function(text) {
      if (!text || text.charAt(0) === '<') {
        return {
          success: false,
          error: 'API unreachable. Redeploy Code.gs as Web App (Execute as Me, Anyone) and update apiUrl in js/config.js.'
        };
      }
      try {
        return JSON.parse(text);
      } catch (e) {
        return {
          success: false,
          error: 'API returned invalid JSON. Redeploy Code.gs as Web App (Execute as Me, Anyone).'
        };
      }
    });
  }

  function serializeArg(arg) {
    if (arg === undefined || arg === null) return '';
    if (typeof arg === 'object') return JSON.stringify(arg);
    return String(arg);
  }

  function callGet(action, args) {
    var params = new URLSearchParams();
    params.set('action', action);

    var hasObject = args.some(function(a) { return a !== null && typeof a === 'object'; });
    if (args.length > 3 || hasObject) {
      params.set('args', JSON.stringify(args));
    } else {
      for (var i = 0; i < args.length; i++) {
        params.set('arg' + i, serializeArg(args[i]));
      }
    }

    var url = getUrl() + (getUrl().indexOf('?') === -1 ? '?' : '&') + params.toString();
    return fetch(url, { method: 'GET', redirect: 'follow' }).then(parseResponse);
  }

  function callPost(action, args) {
    return fetch(getUrl(), {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, args: args })
    }).then(parseResponse);
  }

  function call(action, args) {
    args = args || [];
    if (POST_ACTIONS[action]) return callPost(action, args);
    return callGet(action, args);
  }

  return { call: call };
})();

/** Drop-in replacement for google.script.run (Vercel static hosting) */
(function() {
  var ScriptRun = {
    _ok: null,
    _err: null,
    withSuccessHandler: function(fn) { this._ok = fn; return this; },
    withFailureHandler: function(fn) { this._err = fn; return this; },
    _invoke: function(action, args) {
      var ok = this._ok;
      var err = this._err;
      this._ok = null;
      this._err = null;
      InstaHelpAPI.call(action, args)
        .then(function(res) { if (ok) ok(res); })
        .catch(function(e) {
          if (err) err(e);
          else if (ok) ok({ success: false, error: (e && e.message) || 'Network error' });
        });
    }
  };

  var methods = [
    'getPlans', 'getStoreTemplates', 'getRazorpayKeyId', 'getWebAppUrl',
    'loginAdmin', 'validateAdminSession', 'logoutAdmin',
    'getAdminStats', 'getAllApplications', 'getAllVendors', 'getAllLeads', 'getRevenueAnalytics',
    'approveVendor', 'rejectVendor', 'featureVendor', 'verifyVendor', 'suspendVendor', 'adminSetVendorPlan',
    'submitVendorApplication', 'updateVendor', 'getVendor', 'getVendorStore', 'updateStore',
    'changeTemplate', 'publishStore', 'createRazorpayOrder', 'verifyPayment', 'upgradePlan', 'downgradePlan',
    'getVendorProducts', 'addProduct', 'updateProduct', 'deleteProduct', 'bulkAddProducts',
    'saveLead', 'getVendorLeads', 'updateLeadStatus', 'exportLeadsCSV',
    'recordView', 'recordWhatsappClick', 'recordCallClick', 'getAnalytics', 'getVendorAnalytics',
    'generateQRCode', 'getVendorPayments', 'submitShowcaseForm', 'getHubbleSsoToken',
    'initializeSheets', 'setupSheetReviewControls'
  ];

  methods.forEach(function(method) {
    ScriptRun[method] = function() {
      ScriptRun._invoke(method, Array.prototype.slice.call(arguments));
    };
  });

  window.google = { script: { run: ScriptRun } };
})();
