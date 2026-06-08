/**
 * InstaHelp API client — connects Vercel frontend to Google Apps Script backend
 */
var InstaHelpAPI = (function() {
  'use strict';

  function getUrl() {
    return (window.INSTAHELP_CONFIG && window.INSTAHELP_CONFIG.apiUrl) || '';
  }

  function call(action, args) {
    var payload = { action: action, args: args || [] };

    return fetch(getUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    }).then(function(res) {
      return res.text().then(function(text) {
        try {
          return JSON.parse(text);
        } catch (e) {
          return {
            success: false,
            error: 'API returned invalid JSON. Redeploy Code.gs as Web App (Execute as Me, Anyone).'
          };
        }
      });
    });
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
      var self = this;
      InstaHelpAPI.call(action, args)
        .then(function(res) { if (self._ok) self._ok(res); })
        .catch(function(err) { if (self._err) self._err(err); })
        .finally(function() { self._ok = null; self._err = null; });
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
    'generateQRCode', 'getVendorPayments', 'submitShowcaseForm', 'initializeSheets'
  ];

  methods.forEach(function(method) {
    ScriptRun[method] = function() {
      ScriptRun._invoke(method, Array.prototype.slice.call(arguments));
    };
  });

  window.google = { script: { run: ScriptRun } };
})();
