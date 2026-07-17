/**
 * InstaHelp Vendor Store Builder - Google Apps Script Backend
 * Deploy as Web App: Execute as Me | Anyone can access
 */

var SPREADSHEET_ID = '1-TjwourKbMFaz-LpFMIROmYyqgrK_CQJ3_9ZhWrSnm8';
var DRIVE_FOLDER_NAME = 'InstaHelp Vendor Media';

// Razorpay Live keys — keep Code.gs private; do not commit to public repos
var RAZORPAY_KEY_ID = 'rzp_live_SxW7oDR9YnHxcV';
var RAZORPAY_KEY_SECRET = 'BIDVHZossd79AvBRVyPXwsRA';

// Resend — transactional email (same as resend.emails.send in Node SDK)
var RESEND_API_KEY = 're_PLXzK5Ta_LKZmsjUyRMFwgLnkovLWx1Eu';
var RESEND_FROM_EMAIL = 'onboarding@resend.dev';
var ADMIN_NOTIFY_EMAIL = 'instahelpblr@gmail.com';
// Public site URL — used in approval emails and dashboard links
var FRONTEND_URL = 'https://instahelp.co';

var SHEETS = {
  VENDORS: 'Vendors',
  APPLICATIONS: 'Applications',
  PRODUCTS: 'Products',
  LEADS: 'Leads',
  ANALYTICS: 'Analytics',
  PAYMENTS: 'Payments',
  SHOWCASE_FORMS: 'ShowcaseForms'
};

var HEADERS = {
  VENDORS: ['VendorID','BusinessName','OwnerName','Phone','WhatsApp','Email','Category','YearsInBusiness','City','State','Description','ServiceAreas','WorkingHours','Website','Instagram','Facebook','Logo','CoverBanner','Gallery','Status','ShopSlug','Verified','Featured','Disabled','Suspended','Rating','Plan','Template','ThemeColors','PlanExpiresAt','SubscriptionId','ShowBranding','Published','CreatedAt','UpdatedAt','ReviewAction','ReviewNotes'],
  APPLICATIONS: ['ApplicationID','VendorID','BusinessName','OwnerName','Phone','WhatsApp','Email','Category','YearsInBusiness','City','State','Description','ServiceAreas','WorkingHours','Website','Instagram','Facebook','Logo','CoverBanner','Gallery','ProductsJSON','Plan','Template','PaymentID','GSTCertificate','ShopLicense','Aadhaar','PAN','Status','SubmittedAt','ReviewedAt','ReviewNotes','ReviewAction'],
  PRODUCTS: ['ProductID','VendorID','Title','Description','Price','DiscountPrice','Images','Category','Views','Leads','CreatedAt','UpdatedAt'],
  LEADS: ['LeadID','VendorID','CustomerName','Phone','Requirement','Status','Source','CreatedAt','UpdatedAt'],
  ANALYTICS: ['RecordID','VendorID','Views','UniqueVisitors','WhatsappClicks','Calls','Leads','TrafficSource','Date'],
  PAYMENTS: ['PaymentID','VendorID','OrderID','RazorpayPaymentId','Amount','Plan','BillingType','Status','Date'],
  SHOWCASE_FORMS: ['SubmissionID','FormID','FullName','Phone','Email','Service','Message','Source','PriorPayment','EvidenceConsent','ReferrerUrl','LandingPage','UtmSource','UtmMedium','UtmCampaign','ConfusionReferralFlag','ConfusionInstance','FormToken','Status','CreatedAt']
};

var PLANS = {
  free: { id: 'free', name: 'Free', price: 0, maxProducts: 10, templates: ['classic'], branding: true, analytics: 'basic', featured: false },
  pro: { id: 'pro', name: 'Pro', price: 499, maxProducts: -1, templates: ['classic','luxury','service'], branding: false, analytics: 'advanced', featured: true },
  proplus: { id: 'proplus', name: 'Pro+', price: 999, maxProducts: -1, templates: ['classic','luxury','service','travel'], branding: false, analytics: 'premium', featured: true, priority: true }
};

var STORE_TEMPLATES = {
  classic: { id: 'classic', name: 'Classic Store', tagline: 'Amazon-inspired retail layout', bestFor: 'Electronics, Shops, Retail' },
  luxury: { id: 'luxury', name: 'Luxury Business', tagline: 'Apple-inspired premium design', bestFor: 'Real Estate, Luxury Services' },
  service: { id: 'service', name: 'Service Pro', tagline: 'Urban Company-style services', bestFor: 'Salons, Doctors, Agencies' },
  travel: { id: 'travel', name: 'Travel Premium', tagline: 'Airbnb-inspired experiences', bestFor: 'Travel, Tours, Hotels' }
};

// ─── Admin Auth ────────────────────────────────────────────────
var ADMIN_PASSWORD = "we'll-get-it-done";
var ADMIN_CACHE_PREFIX = 'ih_admin_';
var ADMIN_SESSION_TTL = 21600; // 6 hours

function loginAdmin(password) {
  if (password !== ADMIN_PASSWORD) {
    return { success: false, error: 'Invalid password' };
  }
  var token = Utilities.getUuid();
  CacheService.getScriptCache().put(ADMIN_CACHE_PREFIX + token, '1', ADMIN_SESSION_TTL);
  return { success: true, token: token };
}

function validateAdminSession(token) {
  if (!token) return { success: false };
  var valid = CacheService.getScriptCache().get(ADMIN_CACHE_PREFIX + token) === '1';
  return { success: valid };
}

function logoutAdmin(token) {
  if (token) CacheService.getScriptCache().remove(ADMIN_CACHE_PREFIX + token);
  return { success: true };
}

function checkAdminAuth(adminToken) {
  if (!adminToken || CacheService.getScriptCache().get(ADMIN_CACHE_PREFIX + adminToken) !== '1') {
    return { success: false, error: 'Unauthorized. Please log in again.' };
  }
  return null;
}

// ─── Resend Email ──────────────────────────────────────────────
function getFrontendUrl() {
  return FRONTEND_URL.replace(/\/$/, '');
}

function buildResendFetchRequest(to, subject, html, options) {
  options = options || {};
  var payload = {
    from: RESEND_FROM_EMAIL,
    to: Array.isArray(to) ? to : [String(to).trim()],
    subject: subject,
    html: html
  };
  if (options.replyTo) payload.reply_to = options.replyTo;
  if (options.bcc) payload.bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
  return {
    url: 'https://api.resend.com/emails',
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
}

function parseResendResponse(response) {
  var code = response.getResponseCode();
  var body = {};
  try { body = JSON.parse(response.getContentText()); } catch (e) {}
  if (code >= 200 && code < 300) return { success: true, id: body.id };
  return { success: false, error: body.message || response.getContentText(), status: code };
}

function sendEmailViaResend(to, subject, html, options) {
  if (!to || !String(to).trim()) return { success: false, error: 'No recipient email' };
  try {
    var req = buildResendFetchRequest(to, subject, html, options);
    return parseResendResponse(UrlFetchApp.fetch(req.url, {
      method: req.method,
      headers: req.headers,
      payload: req.payload,
      muteHttpExceptions: req.muteHttpExceptions
    }));
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/** Run once in Apps Script editor: Run → testResendEmail */
function testResendEmail() {
  return sendEmailViaResend(
    ADMIN_NOTIFY_EMAIL,
    'InstaHelp — Resend connected',
    '<p>Congrats on sending your <strong>first email</strong> from InstaHelp Code.gs!</p>'
  );
}

function emailWrapper(title, bodyHtml) {
  return '<div style="font-family:Plus Jakarta Sans,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#12141A">' +
    '<div style="background:#FFD600;padding:14px 20px;border-radius:12px 12px 0 0;font-weight:800">InstaHelp®</div>' +
    '<div style="border:1px solid #E4E4E0;border-top:none;border-radius:0 0 12px 12px;padding:24px;background:#fff">' +
    '<h2 style="margin:0 0 12px;font-size:1.25rem">' + title + '</h2>' + bodyHtml +
    '<p style="margin-top:24px;font-size:12px;color:#7A7E8F">InstaHelp® · +91 70227 02220 · mail@instahelp.in</p></div></div>';
}

function sendVendorApplicationEmail(vendor) {
  var email = vendor.Email || vendor.email;
  if (!email) return { success: false, error: 'No email on file' };
  var name = vendor.OwnerName || vendor.BusinessName || 'there';
  var vid = vendor.VendorID || vendor.vendorId;
  var html = emailWrapper('Application received', '<p>Hi ' + name + ',</p>' +
    '<p>Thank you for applying to InstaHelp Store Builder. We have received your vendor application.</p>' +
    '<p><strong>Reference:</strong> ' + vid + '</p>' +
    '<p>Our team will review your details within 24–48 hours. Once approved, you will receive another email with your <strong>live store link</strong> and <strong>dashboard access</strong> to customize your page.</p>' +
    '<p>Your public store page will not be visible until admin approval.</p>');
  var adminHtml = '<p><strong>' + (vendor.BusinessName || 'New vendor') + '</strong> applied.</p>' +
    '<p>Reference: ' + vid + '<br>Email: ' + email + '</p>' +
    '<p>Review in Admin → Approve to send live store link.</p>';
  try {
    var responses = UrlFetchApp.fetchAll([
      buildResendFetchRequest(email, 'InstaHelp — Vendor application received', html, { replyTo: ADMIN_NOTIFY_EMAIL }),
      buildResendFetchRequest(ADMIN_NOTIFY_EMAIL, 'New vendor application — ' + vid, adminHtml)
    ]);
    return parseResendResponse(responses[0]);
  } catch (e) {
    return sendEmailViaResend(email, 'InstaHelp — Vendor application received', html, {
      replyTo: ADMIN_NOTIFY_EMAIL
    });
  }
}

/** Queue confirmation emails so submit can return before Resend round-trips finish. */
function queueVendorApplicationEmails(vendor) {
  try {
    var props = PropertiesService.getScriptProperties();
    var key = 'APP_EMAIL_' + Utilities.getUuid().replace(/-/g, '').substring(0, 10);
    props.setProperty(key, JSON.stringify({
      Email: vendor.Email || vendor.email,
      OwnerName: vendor.OwnerName,
      BusinessName: vendor.BusinessName,
      VendorID: vendor.VendorID || vendor.vendorId
    }));
    var queue = [];
    try { queue = JSON.parse(props.getProperty('APP_EMAIL_QUEUE') || '[]'); } catch (e) { queue = []; }
    queue.push(key);
    props.setProperty('APP_EMAIL_QUEUE', JSON.stringify(queue));
    var hasTrigger = ScriptApp.getProjectTriggers().some(function(t) {
      return t.getHandlerFunction() === 'processQueuedVendorApplicationEmails';
    });
    if (!hasTrigger) {
      ScriptApp.newTrigger('processQueuedVendorApplicationEmails').timeBased().after(1000).create();
    }
    return { success: true, queued: true };
  } catch (e) {
    return sendVendorApplicationEmail(vendor);
  }
}

function processQueuedVendorApplicationEmails() {
  var props = PropertiesService.getScriptProperties();
  var queue = [];
  try { queue = JSON.parse(props.getProperty('APP_EMAIL_QUEUE') || '[]'); } catch (e) { queue = []; }
  props.deleteProperty('APP_EMAIL_QUEUE');
  queue.forEach(function(key) {
    try {
      var raw = props.getProperty(key);
      props.deleteProperty(key);
      if (raw) sendVendorApplicationEmail(JSON.parse(raw));
    } catch (err) {
      Logger.log('Queued application email failed: ' + err.message);
    }
  });
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'processQueuedVendorApplicationEmails') {
      ScriptApp.deleteTrigger(t);
    }
  });
}

function sendVendorApprovedEmail(vendor) {
  var email = vendor.Email;
  if (!email) return { success: false, error: 'No email on file' };
  var base = getFrontendUrl();
  var shopUrl = base + '/shop/' + encodeURIComponent(vendor.ShopSlug);
  var dashUrl = base + '/vendor/dashboard?vendorId=' + encodeURIComponent(vendor.VendorID);
  var name = vendor.OwnerName || vendor.BusinessName;
  var html = emailWrapper('Your store is live!', '<p>Hi ' + name + ',</p>' +
    '<p>Great news — your InstaHelp vendor application has been <strong>approved</strong>.</p>' +
    '<p style="margin:20px 0"><a href="' + shopUrl + '" style="display:inline-block;background:#FFD600;color:#12141A;padding:12px 22px;border-radius:50px;font-weight:700;text-decoration:none">View your live store →</a></p>' +
    '<p>Customize products, design, and leads from your dashboard:</p>' +
    '<p><a href="' + dashUrl + '">' + dashUrl + '</a></p>' +
    '<p>All updates you make in the dashboard will reflect on your live store page.</p>');
  return sendEmailViaResend(email, 'InstaHelp — Your store is approved & live!', html, {
    replyTo: ADMIN_NOTIFY_EMAIL
  });
}

function sendVendorRejectedEmail(vendor, notes) {
  var email = vendor.Email;
  if (!email) return { success: false, error: 'No email on file' };
  var name = vendor.OwnerName || vendor.BusinessName;
  var html = emailWrapper('Application update', '<p>Hi ' + name + ',</p>' +
    '<p>Thank you for your interest in InstaHelp Store Builder. Unfortunately we could not approve your application at this time.</p>' +
    (notes ? '<p><strong>Note:</strong> ' + notes + '</p>' : '') +
    '<p>Questions? Reply to this email or WhatsApp us at +91 70227 02220.</p>');
  return sendEmailViaResend(email, 'InstaHelp — Vendor application update', html, {
    replyTo: ADMIN_NOTIFY_EMAIL
  });
}

// ─── JSON API (Vercel / external frontend) ─────────────────────
function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeApiArgs(args) {
  if (!args || !args.length) return [];
  return args.map(function(a) {
    if (typeof a !== 'string' || !a) return a;
    var c = a.charAt(0);
    if (c === '{' || c === '[') {
      try { return JSON.parse(a); } catch (e) {}
    }
    return a;
  });
}

function parseGetApiArgs(e) {
  var p = e.parameter || {};
  if (p.args) {
    try {
      var parsed = JSON.parse(p.args);
      return normalizeApiArgs(Array.isArray(parsed) ? parsed : [parsed]);
    } catch (err) {}
  }
  var args = [];
  var i = 0;
  while (Object.prototype.hasOwnProperty.call(p, 'arg' + i)) {
    args.push(p['arg' + i]);
    i++;
  }
  if (!args.length) {
    if (p.arg0 !== undefined) args.push(p.arg0);
    if (p.arg1 !== undefined) args.push(p.arg1);
    if (p.arg2 !== undefined) args.push(p.arg2);
  }
  return normalizeApiArgs(args);
}

function routeApi(payload) {
  var action = payload.action;
  var args = normalizeApiArgs(payload.args || []);
  var data = payload.data;

  switch (action) {
    case 'getPlans': return getPlans();
    case 'getStoreTemplates': return getStoreTemplates();
    case 'getRazorpayKeyId': return { success: true, keyId: getRazorpayKeyId() };
    case 'getWebAppUrl': return { success: true, url: getWebAppUrl() };
    case 'loginAdmin': return loginAdmin(args[0]);
    case 'validateAdminSession': return validateAdminSession(args[0]);
    case 'logoutAdmin': return logoutAdmin(args[0]);
    case 'getAdminStats': return getAdminStats(args[0]);
    case 'getAllApplications': return getAllApplications(args[0]);
    case 'getAllVendors': return getAllVendors(args[0]);
    case 'getAllLeads': return getAllLeads(args[0]);
    case 'getRevenueAnalytics': return getRevenueAnalytics(args[0]);
    case 'approveVendor': return approveVendor(args[0], args[1], args[2]);
    case 'rejectVendor': return rejectVendor(args[0], args[1], args[2]);
    case 'featureVendor': return featureVendor(args[0], args[1], args[2]);
    case 'verifyVendor': return verifyVendor(args[0], args[1], args[2]);
    case 'suspendVendor': return suspendVendor(args[0], args[1], args[2]);
    case 'adminSetVendorPlan': return adminSetVendorPlan(args[0], args[1], args[2]);
    case 'submitVendorApplication': return submitVendorApplication(args[0]);
    case 'updateVendor': return updateVendor(args[0], args[1]);
    case 'getVendor': return getVendor(args[0]);
    case 'getVendorStore': return getVendorStore(args[0]);
    case 'updateStore': return updateStore(args[0], args[1]);
    case 'changeTemplate': return changeTemplate(args[0], args[1]);
    case 'publishStore': return publishStore(args[0]);
    case 'createRazorpayOrder': return createRazorpayOrder(args[0], args[1], args[2]);
    case 'verifyPayment': return verifyPayment(args[0]);
    case 'upgradePlan': return upgradePlan(args[0], args[1]);
    case 'downgradePlan': return downgradePlan(args[0], args[1]);
    case 'getVendorProducts': return getVendorProducts(args[0]);
    case 'addProduct': return addProduct(args[0]);
    case 'updateProduct': return updateProduct(args[0], args[1]);
    case 'deleteProduct': return deleteProduct(args[0]);
    case 'bulkAddProducts': return bulkAddProducts(args[0], args[1]);
    case 'saveLead': return saveLead(args[0]);
    case 'getVendorLeads': return getVendorLeads(args[0]);
    case 'updateLeadStatus': return updateLeadStatus(args[0], args[1]);
    case 'exportLeadsCSV': return exportLeadsCSV(args[0]);
    case 'recordView': return recordView(args[0], args[1]);
    case 'recordWhatsappClick': return recordWhatsappClick(args[0]);
    case 'recordCallClick': return recordCallClick(args[0]);
    case 'getAnalytics': return getAnalytics(args[0]);
    case 'getVendorAnalytics': return getVendorAnalytics(args[0]);
    case 'generateQRCode': return generateQRCode(args[0]);
    case 'getVendorPayments': return getVendorPayments(args[0]);
    case 'submitShowcaseForm': return submitShowcaseForm(args[0]);
    case 'getHubbleSsoToken': return getHubbleSsoToken(args[0]);
    case 'initializeSheets': return initializeSheets();
    case 'setupSheetReviewControls': return setupSheetReviewControls();
    default: return { success: false, error: 'Unknown action: ' + action };
  }
}

// ─── Routing (GAS-hosted HTML fallback) ──────────────────────
function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    return jsonOutput(routeApi({ action: e.parameter.action, args: parseGetApiArgs(e) }));
  }
  var page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'apply';
  var template;
  switch (page) {
    case 'shop':
      template = HtmlService.createTemplateFromFile('shop');
      template.shopSlug = e.parameter.shop || '';
      break;
    case 'dashboard':
      template = HtmlService.createTemplateFromFile('vendor-dashboard');
      template.vendorId = e.parameter.vendorId || '';
      break;
    case 'admin':
      template = HtmlService.createTemplateFromFile('admin-dashboard');
      break;
    default:
      template = HtmlService.createTemplateFromFile('vendor-registration');
  }
  return template.evaluate()
    .setTitle('InstaHelp Store Builder')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doPost(e) {
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch (err) {}
    }
    if (!data.action && e && e.parameter) data = e.parameter;

    if (data.action) {
      return jsonOutput(routeApi(data));
    }
    if (data.fullname || data.message) {
      return jsonOutput(submitShowcaseForm(data));
    }
    return jsonOutput({ success: false, error: 'Invalid request' });
  } catch (err) {
    return jsonOutput({ success: false, error: err.message });
  }
}

// ─── Sheet Helpers ─────────────────────────────────────────────
function initializeSheets() {
  Object.keys(SHEETS).forEach(function(key) {
    ensureSheetHeaders(key);
  });
  setupSheetReviewControls();
  return { success: true, message: 'Sheets ready. Use ReviewAction column: Approve or Reject.' };
}

function ensureSheetHeaders(key) {
  var sheetName = SHEETS[key];
  var expected = HEADERS[key];
  if (!expected) return;
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  var maxCol = Math.max(sheet.getLastColumn(), expected.length, 1);
  var row1 = sheet.getLastRow() >= 1
    ? sheet.getRange(1, 1, 1, maxCol).getValues()[0]
    : [];
  var needsFullReset = sheet.getLastRow() === 0 || !row1[0] || String(row1[0]).trim() !== expected[0];
  if (!needsFullReset) {
    var alreadyOk = true;
    for (var h = 0; h < expected.length; h++) {
      if (String(row1[h] || '').trim() !== expected[h]) { alreadyOk = false; break; }
    }
    if (alreadyOk) return;
  }
  if (needsFullReset) {
    sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
  } else {
    var merged = [];
    for (var i = 0; i < expected.length; i++) {
      merged.push(row1[i] ? row1[i] : expected[i]);
    }
    sheet.getRange(1, 1, 1, expected.length).setValues([merged]);
  }
  sheet.getRange(1, 1, 1, expected.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}

function getSpreadsheet() {
  if (SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') throw new Error('Set SPREADSHEET_ID in Code.gs');
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet(sheetName) { return getSpreadsheet().getSheetByName(sheetName); }

function getColMap(sheetName) {
  var sheet = getSheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  var map = {};
  headers.forEach(function(h, i) { if (h) map[h] = i + 1; });
  return map;
}

function setField(sheetName, rowIndex, field, value) {
  var col = getColMap(sheetName)[field];
  if (col) getSheet(sheetName).getRange(rowIndex, col).setValue(value);
}

/** Batch-update several fields on one row with a single column map lookup. */
function setFields(sheetName, rowIndex, updates) {
  var map = getColMap(sheetName);
  var sheet = getSheet(sheetName);
  Object.keys(updates).forEach(function(field) {
    var col = map[field];
    if (col) sheet.getRange(rowIndex, col).setValue(updates[field]);
  });
}

function generateId(prefix) {
  return prefix + '_' + Utilities.getUuid().replace(/-/g, '').substring(0, 12).toUpperCase();
}

function rowToObject(headers, row) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) obj[headers[i]] = row[i];
  return obj;
}

function getAllRows(sheetName) {
  var sheet = getSheet(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0].map(function(h) { return String(h || '').trim(); });
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var empty = true;
    for (var j = 0; j < row.length; j++) {
      if (row[j] !== '' && row[j] !== null && row[j] !== undefined) { empty = false; break; }
    }
    if (empty) continue;
    var obj = rowToObject(headers, row);
    if (obj.Status !== undefined && obj.Status !== '') obj.Status = String(obj.Status).toLowerCase().trim();
    rows.push(obj);
  }
  return rows;
}

function vendorToApplicationRow(v) {
  return {
    ApplicationID: 'VND_' + v.VendorID,
    VendorID: v.VendorID,
    BusinessName: v.BusinessName,
    OwnerName: v.OwnerName,
    Phone: v.Phone,
    Email: v.Email,
    Plan: v.Plan || 'free',
    Template: v.Template || 'classic',
    City: v.City || '',
    Status: String(v.Status || 'pending').toLowerCase().trim(),
    SubmittedAt: v.CreatedAt || ''
  };
}

function getRowByColumn(sheet, columnIndex, value) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][columnIndex]) === String(value)) {
      var obj = rowToObject(headers, data[i]);
      obj._rowIndex = i + 1;
      return obj;
    }
  }
  return null;
}

function getRowByField(sheetName, field, value) {
  var sheet = getSheet(sheetName);
  var col = getColMap(sheetName)[field] - 1;
  return getRowByColumn(sheet, col, value);
}

// ─── Media ─────────────────────────────────────────────────────
var _driveFolderCache = null;

function getVendorMediaFolder() {
  if (_driveFolderCache) return _driveFolderCache;
  var cachedId = CacheService.getScriptCache().get('DRIVE_MEDIA_FOLDER_ID');
  if (cachedId) {
    try {
      _driveFolderCache = DriveApp.getFolderById(cachedId);
      return _driveFolderCache;
    } catch (e) {}
  }
  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(DRIVE_FOLDER_NAME);
  CacheService.getScriptCache().put('DRIVE_MEDIA_FOLDER_ID', folder.getId(), 21600);
  _driveFolderCache = folder;
  return folder;
}

function uploadToDrive(base64Data, fileName, mimeType) {
  try {
    if (!base64Data || base64Data.indexOf('base64,') === -1) return '';
    var bytes = Utilities.base64Decode(base64Data.split('base64,')[1]);
    var blob = Utilities.newBlob(bytes, mimeType || 'image/jpeg', fileName);
    var file = getVendorMediaFolder().createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://drive.google.com/uc?id=' + file.getId();
  } catch (e) { return ''; }
}

function processMediaField(value, fileName) {
  if (!value) return '';
  if (typeof value === 'string' && value.indexOf('http') === 0) return value;
  if (typeof value === 'string' && value.indexOf('base64') !== -1) return uploadToDrive(value, fileName, 'image/jpeg');
  return value;
}

function processMediaArray(arr, prefix) {
  if (!arr || !Array.isArray(arr)) return JSON.stringify([]);
  return JSON.stringify(arr.map(function(item, idx) {
    if (typeof item === 'string' && item.indexOf('http') === 0) return item;
    return processMediaField(item, prefix + '_' + idx + '.jpg');
  }));
}

// ─── Plans & Templates API ─────────────────────────────────────
function getPlans() {
  return { success: true, plans: PLANS };
}

function getStoreTemplates() {
  return { success: true, templates: STORE_TEMPLATES };
}

function getRazorpayKeyId() {
  return RAZORPAY_KEY_ID;
}

function getPlanLimits(planId) {
  return PLANS[planId] || PLANS.free;
}

// ─── Slug ──────────────────────────────────────────────────────
function generateShopSlug(businessName) {
  var slug = businessName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  var existing = getAllRows(SHEETS.VENDORS).map(function(v) { return v.ShopSlug; });
  var base = slug, n = 1;
  while (existing.indexOf(slug) !== -1) { slug = base + '-' + n; n++; }
  return slug;
}

// ─── Razorpay ──────────────────────────────────────────────────
function createRazorpayOrder(vendorId, planId, billingType) {
  try {
    initializeSheets();
    var plan = PLANS[planId];
    if (!plan || plan.price === 0) return { success: true, free: true, plan: planId };

    var amount = plan.price * 100;
    var receipt = vendorId + '_' + Date.now();
    var payload = {
      amount: amount,
      currency: 'INR',
      receipt: receipt,
      notes: { vendorId: vendorId, plan: planId, billingType: billingType || 'one_time' }
    };

    var response = UrlFetchApp.fetch('https://api.razorpay.com/v1/orders', {
      method: 'post',
      headers: {
        Authorization: 'Basic ' + Utilities.base64Encode(RAZORPAY_KEY_ID + ':' + RAZORPAY_KEY_SECRET),
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var result = JSON.parse(response.getContentText());
    if (result.error) return { success: false, error: result.error.description || 'Payment order failed' };

    var paymentId = generateId('PAY');
    getSheet(SHEETS.PAYMENTS).appendRow([
      paymentId, vendorId, result.id, '', plan.price, planId,
      billingType || 'one_time', 'created', new Date().toISOString()
    ]);

    return {
      success: true,
      orderId: result.id,
      amount: amount,
      currency: 'INR',
      keyId: RAZORPAY_KEY_ID,
      paymentRecordId: paymentId,
      plan: planId
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function verifyRazorpaySignature(orderId, paymentId, signature) {
  var body = orderId + '|' + paymentId;
  var bytes = Utilities.computeHmacSha256Signature(body, RAZORPAY_KEY_SECRET);
  var generated = bytes.map(function(b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
  return generated === signature;
}

function verifyPayment(data) {
  try {
    initializeSheets();
    var valid = verifyRazorpaySignature(data.orderId, data.paymentId, data.signature);
    if (!valid) return { success: false, error: 'Invalid payment signature' };

    var payments = getAllRows(SHEETS.PAYMENTS);
    var payment = null;
    payments.forEach(function(p) {
      if (p.OrderID === data.orderId) payment = p;
    });
    if (!payment) return { success: false, error: 'Payment record not found' };

    var row = getRowByField(SHEETS.PAYMENTS, 'PaymentID', payment.PaymentID);
    setField(SHEETS.PAYMENTS, row._rowIndex, 'RazorpayPaymentId', data.paymentId);
    setField(SHEETS.PAYMENTS, row._rowIndex, 'Status', 'captured');

    var planId = payment.Plan || data.plan || 'pro';
    activatePlan(payment.VendorID, planId, payment.BillingType);

    return { success: true, vendorId: payment.VendorID, plan: planId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function planExpiresAt(planId, billingType) {
  var plan = PLANS[planId] || PLANS.free;
  var expires = new Date();
  if (billingType === 'subscription' || plan.price > 0) expires.setMonth(expires.getMonth() + 1);
  else expires.setFullYear(expires.getFullYear() + 10);
  return expires.toISOString();
}

function activatePlan(vendorId, planId, billingType) {
  var plan = PLANS[planId] || PLANS.free;
  var row = getRowByField(SHEETS.VENDORS, 'VendorID', vendorId);
  if (!row) return;
  setFields(SHEETS.VENDORS, row._rowIndex, {
    Plan: planId,
    PlanExpiresAt: planExpiresAt(planId, billingType),
    ShowBranding: plan.branding,
    UpdatedAt: new Date().toISOString()
  });
}

function upgradePlan(vendorId, newPlanId) {
  try {
    var row = getRowByField(SHEETS.VENDORS, 'VendorID', vendorId);
    if (!row) return { success: false, error: 'Vendor not found' };
    if (PLANS[newPlanId].price === 0) {
      activatePlan(vendorId, newPlanId, 'one_time');
      return { success: true, plan: newPlanId };
    }
    return createRazorpayOrder(vendorId, newPlanId, 'subscription');
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function downgradePlan(vendorId, newPlanId) {
  try {
    activatePlan(vendorId, newPlanId || 'free', 'one_time');
    var row = getRowByField(SHEETS.VENDORS, 'VendorID', vendorId);
    if (row && newPlanId === 'free') {
      setField(SHEETS.VENDORS, row._rowIndex, 'Template', 'classic');
      setField(SHEETS.VENDORS, row._rowIndex, 'Featured', false);
    }
    return { success: true, plan: newPlanId || 'free' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getVendorPayments(vendorId) {
  try {
    var payments = getAllRows(SHEETS.PAYMENTS).filter(function(p) { return p.VendorID === vendorId; });
    return { success: true, payments: payments };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── Vendor Application ────────────────────────────────────────
function submitVendorApplication(data) {
  try {
    var vendorId = data.vendorId || generateId('VND');
    var vendorsSheet = getSheet(SHEETS.VENDORS);
    if (!vendorsSheet) throw new Error('Vendors sheet missing. Run initializeSheets once from the Apps Script editor.');

    var existing = getRowByField(SHEETS.VENDORS, 'VendorID', vendorId);
    var appId = generateId('APP');
    var slug = existing ? existing.ShopSlug : generateShopSlug(data.businessName);
    var now = new Date().toISOString();
    var planId = data.plan || 'free';
    var templateId = data.template || 'classic';
    var plan = PLANS[planId] || PLANS.free;
    var shouldActivate = planId === 'free' || data.paymentVerified;

    if (plan.templates.indexOf(templateId) === -1) templateId = plan.templates[0];

    var logo = processMediaField(data.logo, vendorId + '_logo.jpg');
    var cover = processMediaField(data.coverBanner, vendorId + '_cover.jpg');
    var gallery = processMediaArray(data.gallery || [], vendorId + '_gallery');
    var themeColors = data.themeColors ? JSON.stringify(data.themeColors) : '{"primary":"#FFD600","accent":"#0F0F0F"}';
    var expiresAt = shouldActivate ? planExpiresAt(planId, 'one_time') : '';

    if (!existing) {
      vendorsSheet.appendRow([
        vendorId, data.businessName, data.ownerName, data.phone, data.whatsapp || data.phone,
        data.email, data.category || '', data.yearsInBusiness || '', data.city || '', data.state || '',
        data.description || '', data.serviceAreas || '', data.workingHours || '',
        data.website || '', data.instagram || '', data.facebook || '',
        logo, cover, gallery, 'pending', slug, false, plan.featured, false, false, 4.8,
        planId, templateId, themeColors, expiresAt, '', plan.branding, false, now, now, '', ''
      ]);
    } else {
      var updates = {
        BusinessName: data.businessName,
        Plan: planId,
        Template: templateId,
        ThemeColors: themeColors,
        UpdatedAt: now
      };
      if (logo) updates.Logo = logo;
      if (cover) updates.CoverBanner = cover;
      if (gallery) updates.Gallery = gallery;
      if (shouldActivate) {
        updates.PlanExpiresAt = expiresAt;
        updates.ShowBranding = plan.branding;
      }
      setFields(SHEETS.VENDORS, existing._rowIndex, updates);
    }

    var applicationsSheet = getSheet(SHEETS.APPLICATIONS);
    if (applicationsSheet) {
      try {
        applicationsSheet.appendRow([
          appId, vendorId, data.businessName, data.ownerName, data.phone, data.whatsapp || data.phone,
          data.email, data.category || '', data.yearsInBusiness || '', data.city || '', data.state || '',
          data.description || '', data.serviceAreas || '', data.workingHours || '',
          data.website || '', data.instagram || '', data.facebook || '',
          logo, cover, gallery, JSON.stringify(data.products || []),
          planId, templateId, data.paymentId || '',
          processMediaField(data.gstCertificate, vendorId + '_gst.pdf'),
          processMediaField(data.shopLicense, vendorId + '_license.pdf'),
          processMediaField(data.aadhaar, vendorId + '_aadhaar.pdf'),
          processMediaField(data.pan, vendorId + '_pan.pdf'),
          'pending', now, '', '', ''
        ]);
      } catch (appErr) {
        Logger.log('Applications row error (vendor still saved): ' + appErr.message);
      }
    }

    var products = data.products || [];
    if (products.length) {
      var productsSheet = getSheet(SHEETS.PRODUCTS);
      if (productsSheet) {
        var maxProducts = plan.maxProducts;
        var toAdd = maxProducts > 0 ? products.slice(0, maxProducts) : products;
        toAdd.forEach(function(p) {
          var productId = generateId('PRD');
          productsSheet.appendRow([
            productId, vendorId, p.title, p.description || '', p.price || 0,
            p.discountPrice || '', processMediaArray(p.images || [], productId),
            p.category || '', 0, 0, now, now
          ]);
        });
      }
    }

    var emailResult = queueVendorApplicationEmails({
      VendorID: vendorId, Email: data.email, OwnerName: data.ownerName, BusinessName: data.businessName
    });

    return {
      success: true, vendorId: vendorId, applicationId: appId, shopSlug: slug,
      plan: planId, template: templateId, status: 'pending',
      dashboardUrl: getFrontendUrl() + '/vendor/dashboard?vendorId=' + encodeURIComponent(vendorId),
      shopUrl: getFrontendUrl() + '/shop/' + encodeURIComponent(slug),
      emailSent: emailResult.success, emailError: emailResult.error || ''
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── Vendor Store ──────────────────────────────────────────────
function getVendor(identifier) {
  try {
    var row = getRowByField(SHEETS.VENDORS, 'VendorID', identifier) || getRowByField(SHEETS.VENDORS, 'ShopSlug', identifier);
    if (!row) return { success: false, error: 'Vendor not found' };
    delete row._rowIndex;
    row.planLimits = getPlanLimits(row.Plan || 'free');
    return { success: true, vendor: row };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getVendorStore(slug) {
  try {
    var vendorRes = getVendor(slug);
    if (!vendorRes.success) return vendorRes;
    var vendor = vendorRes.vendor;
    if (vendor.Suspended === true || vendor.Suspended === 'TRUE' || vendor.Disabled === true || vendor.Disabled === 'TRUE') {
      return { success: false, error: 'Store suspended' };
    }
    if (vendor.Status !== 'active') {
      if (vendor.Status === 'pending') return { success: false, error: 'This store is pending admin approval' };
      if (vendor.Status === 'rejected') return { success: false, error: 'This store is not available' };
      return { success: false, error: 'Store not available' };
    }
    if (vendor.Published !== true && vendor.Published !== 'TRUE') {
      return { success: false, error: 'Store is being set up. Please check back soon.' };
    }
    var productsRes = getVendorProducts(vendor.VendorID);
    var plan = getPlanLimits(vendor.Plan || 'free');
    var products = productsRes.products || [];
    if (plan.maxProducts > 0) products = products.slice(0, plan.maxProducts);

    return {
      success: true,
      store: {
        vendor: vendor,
        products: products,
        template: vendor.Template || 'classic',
        themeColors: parseJSONSafe(vendor.ThemeColors, { primary: '#FFD600', accent: '#0F0F0F' }),
        showBranding: vendor.ShowBranding === true || vendor.ShowBranding === 'TRUE' || plan.branding,
        plan: plan
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function updateStore(vendorId, data) { return updateVendor(vendorId, data); }

function changeTemplate(vendorId, templateId) {
  try {
    var row = getRowByField(SHEETS.VENDORS, 'VendorID', vendorId);
    if (!row) return { success: false, error: 'Vendor not found' };
    var plan = getPlanLimits(row.Plan || 'free');
    if (plan.templates.indexOf(templateId) === -1) {
      return { success: false, error: 'Template not available on your plan. Upgrade to unlock.' };
    }
    setField(SHEETS.VENDORS, row._rowIndex, 'Template', templateId);
    setField(SHEETS.VENDORS, row._rowIndex, 'UpdatedAt', new Date().toISOString());
    return { success: true, template: templateId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function updateVendor(vendorId, data) {
  try {
    var row = getRowByField(SHEETS.VENDORS, 'VendorID', vendorId);
    if (!row) return { success: false, error: 'Vendor not found' };

    var fields = ['BusinessName','OwnerName','Phone','WhatsApp','Email','Category','YearsInBusiness','City','State','Description','ServiceAreas','WorkingHours','Website','Instagram','Facebook'];
    var keys = ['businessName','ownerName','phone','whatsapp','email','category','yearsInBusiness','city','state','description','serviceAreas','workingHours','website','instagram','facebook'];
    keys.forEach(function(k, i) {
      if (data[k] !== undefined) setField(SHEETS.VENDORS, row._rowIndex, fields[i], data[k]);
    });

    if (data.logo) setField(SHEETS.VENDORS, row._rowIndex, 'Logo', processMediaField(data.logo, vendorId + '_logo.jpg'));
    if (data.coverBanner) setField(SHEETS.VENDORS, row._rowIndex, 'CoverBanner', processMediaField(data.coverBanner, vendorId + '_cover.jpg'));
    if (data.gallery) setField(SHEETS.VENDORS, row._rowIndex, 'Gallery', processMediaArray(data.gallery, vendorId + '_gallery'));
    if (data.themeColors) setField(SHEETS.VENDORS, row._rowIndex, 'ThemeColors', JSON.stringify(data.themeColors));
    if (data.published !== undefined) setField(SHEETS.VENDORS, row._rowIndex, 'Published', data.published);
    setField(SHEETS.VENDORS, row._rowIndex, 'UpdatedAt', new Date().toISOString());
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function publishStore(vendorId) {
  try {
    var row = getRowByField(SHEETS.VENDORS, 'VendorID', vendorId);
    if (!row) return { success: false, error: 'Vendor not found' };
    if (row.Status !== 'active') {
      return { success: false, error: 'Your store must be approved by admin before it can go live. You will receive an email when approved.' };
    }
    setField(SHEETS.VENDORS, row._rowIndex, 'Published', true);
    setField(SHEETS.VENDORS, row._rowIndex, 'UpdatedAt', new Date().toISOString());
    return { success: true, shopSlug: row.ShopSlug };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── Admin Vendor Actions ──────────────────────────────────────
function approveVendorCore(vendorId, notes) {
  var row = getRowByField(SHEETS.VENDORS, 'VendorID', vendorId);
  if (!row) return { success: false, error: 'Vendor not found' };
  var now = new Date().toISOString();
  setField(SHEETS.VENDORS, row._rowIndex, 'Status', 'active');
  setField(SHEETS.VENDORS, row._rowIndex, 'Verified', true);
  setField(SHEETS.VENDORS, row._rowIndex, 'Published', true);
  setField(SHEETS.VENDORS, row._rowIndex, 'UpdatedAt', now);
  if (notes) setField(SHEETS.VENDORS, row._rowIndex, 'ReviewNotes', notes);
  setField(SHEETS.VENDORS, row._rowIndex, 'ReviewAction', 'Done');

  getAllRows(SHEETS.APPLICATIONS).forEach(function(app) {
    if (app.VendorID === vendorId && String(app.Status || '').toLowerCase() === 'pending') {
      var appRow = getRowByField(SHEETS.APPLICATIONS, 'ApplicationID', app.ApplicationID);
      if (appRow) {
        setField(SHEETS.APPLICATIONS, appRow._rowIndex, 'Status', 'approved');
        setField(SHEETS.APPLICATIONS, appRow._rowIndex, 'ReviewedAt', now);
        setField(SHEETS.APPLICATIONS, appRow._rowIndex, 'ReviewNotes', notes || 'Approved from sheet');
        setField(SHEETS.APPLICATIONS, appRow._rowIndex, 'ReviewAction', 'Done');
      }
    }
  });

  var vendorData = getRowByField(SHEETS.VENDORS, 'VendorID', vendorId);
  delete vendorData._rowIndex;
  var emailResult = sendVendorApprovedEmail(vendorData);

  return {
    success: true, shopSlug: row.ShopSlug,
    shopUrl: getFrontendUrl() + '/shop/' + encodeURIComponent(row.ShopSlug),
    dashboardUrl: getFrontendUrl() + '/vendor/dashboard?vendorId=' + encodeURIComponent(vendorId),
    emailSent: emailResult.success, emailError: emailResult.error || ''
  };
}

function rejectVendorCore(vendorId, notes) {
  var row = getRowByField(SHEETS.VENDORS, 'VendorID', vendorId);
  if (!row) return { success: false, error: 'Vendor not found' };
  var now = new Date().toISOString();
  setField(SHEETS.VENDORS, row._rowIndex, 'Status', 'rejected');
  setField(SHEETS.VENDORS, row._rowIndex, 'Published', false);
  setField(SHEETS.VENDORS, row._rowIndex, 'UpdatedAt', now);
  if (notes) setField(SHEETS.VENDORS, row._rowIndex, 'ReviewNotes', notes);
  setField(SHEETS.VENDORS, row._rowIndex, 'ReviewAction', 'Done');

  getAllRows(SHEETS.APPLICATIONS).forEach(function(app) {
    if (app.VendorID === vendorId && String(app.Status || '').toLowerCase() === 'pending') {
      var appRow = getRowByField(SHEETS.APPLICATIONS, 'ApplicationID', app.ApplicationID);
      if (appRow) {
        setField(SHEETS.APPLICATIONS, appRow._rowIndex, 'Status', 'rejected');
        setField(SHEETS.APPLICATIONS, appRow._rowIndex, 'ReviewedAt', now);
        setField(SHEETS.APPLICATIONS, appRow._rowIndex, 'ReviewNotes', notes || 'Rejected from sheet');
        setField(SHEETS.APPLICATIONS, appRow._rowIndex, 'ReviewAction', 'Done');
      }
    }
  });

  var vendorData = getRowByField(SHEETS.VENDORS, 'VendorID', vendorId);
  delete vendorData._rowIndex;
  var emailResult = sendVendorRejectedEmail(vendorData, notes);

  return { success: true, emailSent: emailResult.success };
}

function approveVendor(vendorId, notes, adminToken) {
  var auth = checkAdminAuth(adminToken);
  if (auth) return auth;
  try {
    return approveVendorCore(vendorId, notes);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function rejectVendor(vendorId, notes, adminToken) {
  var auth = checkAdminAuth(adminToken);
  if (auth) return auth;
  try {
    return rejectVendorCore(vendorId, notes);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── Google Sheets: Approve / Reject from spreadsheet ───────────
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('InstaHelp Admin')
      .addItem('Setup Review columns (Approve/Reject dropdown)', 'setupSheetReviewControls')
      .addItem('Approve selected row', 'menuApproveSelectedRow')
      .addItem('Reject selected row', 'menuRejectSelectedRow')
      .addSeparator()
      .addItem('Initialize all sheets', 'initializeSheets')
      .addToUi();
  } catch (e) {
    Logger.log('onOpen: ' + e.message);
  }
}

function setupSheetReviewControls() {
  ensureSheetHeaders('VENDORS');
  ensureSheetHeaders('APPLICATIONS');
  applyReviewDropdown(SHEETS.VENDORS);
  applyReviewDropdown(SHEETS.APPLICATIONS);
  return { success: true, message: 'ReviewAction columns ready on Vendors & Applications sheets.' };
}

function applyReviewDropdown(sheetName) {
  var sheet = getSheet(sheetName);
  if (!sheet) return;
  var colMap = getColMap(sheetName);
  var actionCol = colMap['ReviewAction'];
  if (!actionCol) return;
  var lastRow = Math.max(sheet.getLastRow(), 500);
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['', 'Approve', 'Reject', 'Done'], true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, actionCol, lastRow, 1).setDataValidation(rule);
  sheet.getRange(1, actionCol)
    .setBackground('#FFD600')
    .setFontWeight('bold')
    .setNote('Select Approve or Reject — action runs automatically. Add notes in ReviewNotes first.');
  if (colMap['ReviewNotes']) {
    sheet.getRange(1, colMap['ReviewNotes']).setBackground('#FFF8CC').setFontWeight('bold');
  }
}

function onEdit(e) {
  try {
    if (!e || !e.range || e.range.getRow() < 2) return;
    var sheet = e.range.getSheet();
    var sheetName = sheet.getName();
    if (sheetName !== SHEETS.VENDORS && sheetName !== SHEETS.APPLICATIONS) return;

    var colMap = getColMap(sheetName);
    var reviewCol = colMap['ReviewAction'];
    if (!reviewCol || e.range.getColumn() !== reviewCol) return;

    var action = String(e.value || '').trim().toLowerCase();
    if (!action || action === 'done' || action === 'pending') return;

    var vendorId = String(sheet.getRange(e.range.getRow(), colMap['VendorID']).getValue() || '').trim();
    if (!vendorId) return;

    var notesCol = colMap['ReviewNotes'];
    var notes = notesCol ? String(sheet.getRange(e.range.getRow(), notesCol).getValue() || '') : '';

    var lock = LockService.getScriptLock();
    if (!lock.tryLock(8000)) return;
    try {
      processSheetReviewAction(sheetName, e.range.getRow(), action, vendorId, notes);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    Logger.log('onEdit error: ' + err.message);
  }
}

function processSheetReviewAction(sheetName, rowIndex, action, vendorId, notes) {
  var result;
  if (action === 'approve' || action === 'approved') {
    result = approveVendorCore(vendorId, notes);
  } else if (action === 'reject' || action === 'rejected') {
    result = rejectVendorCore(vendorId, notes);
  } else {
    return { success: false, error: 'Unknown action: ' + action };
  }

  var sheet = getSheet(sheetName);
  var actionCol = getColMap(sheetName)['ReviewAction'];
  if (sheet && actionCol) {
    sheet.getRange(rowIndex, actionCol).setValue(result.success ? 'Done' : 'Error');
  }
  if (!result.success) {
    SpreadsheetApp.getActiveSpreadsheet().toast(result.error || 'Action failed', 'InstaHelp', 5);
  } else {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      action.indexOf('reject') !== -1 ? 'Vendor rejected' : 'Vendor approved & store live',
      'InstaHelp',
      5
    );
  }
  return result;
}

function menuApproveSelectedRow() {
  runMenuReviewAction('approve');
}

function menuRejectSelectedRow() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt('Reject vendor', 'Reason (optional):', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  runMenuReviewAction('reject', response.getResponseText() || '');
}

function runMenuReviewAction(action, notes) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var sheetName = sheet.getName();
  if (sheetName !== SHEETS.VENDORS && sheetName !== SHEETS.APPLICATIONS) {
    SpreadsheetApp.getUi().alert('Select a row on the Vendors or Applications sheet.');
    return;
  }
  var row = SpreadsheetApp.getActiveRange().getRow();
  if (row < 2) {
    SpreadsheetApp.getUi().alert('Select a data row (not the header).');
    return;
  }
  var colMap = getColMap(sheetName);
  var vendorId = String(sheet.getRange(row, colMap['VendorID']).getValue() || '').trim();
  if (!vendorId) {
    SpreadsheetApp.getUi().alert('No VendorID in this row.');
    return;
  }
  if (!notes && colMap['ReviewNotes']) {
    notes = String(sheet.getRange(row, colMap['ReviewNotes']).getValue() || '');
  }
  processSheetReviewAction(sheetName, row, action, vendorId, notes);
}

function suspendVendor(vendorId, suspended, adminToken) {
  var auth = checkAdminAuth(adminToken);
  if (auth) return auth;
  try {
    var row = getRowByField(SHEETS.VENDORS, 'VendorID', vendorId);
    if (!row) return { success: false, error: 'Vendor not found' };
    setField(SHEETS.VENDORS, row._rowIndex, 'Suspended', suspended === true || suspended === 'true');
    if (suspended) setField(SHEETS.VENDORS, row._rowIndex, 'Status', 'suspended');
    else setField(SHEETS.VENDORS, row._rowIndex, 'Status', 'active');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function featureVendor(vendorId, featured, adminToken) {
  var auth = checkAdminAuth(adminToken);
  if (auth) return auth;
  try {
    var row = getRowByField(SHEETS.VENDORS, 'VendorID', vendorId);
    if (!row) return { success: false, error: 'Vendor not found' };
    setField(SHEETS.VENDORS, row._rowIndex, 'Featured', featured === true || featured === 'true');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function verifyVendor(vendorId, verified, adminToken) {
  var auth = checkAdminAuth(adminToken);
  if (auth) return auth;
  try {
    var row = getRowByField(SHEETS.VENDORS, 'VendorID', vendorId);
    if (!row) return { success: false, error: 'Vendor not found' };
    setField(SHEETS.VENDORS, row._rowIndex, 'Verified', verified === true || verified === 'true');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function disableVendor(vendorId, disabled, adminToken) { return suspendVendor(vendorId, disabled, adminToken); }

function getAllVendors(adminToken) {
  var auth = checkAdminAuth(adminToken);
  if (auth) return auth;
  try {
    ensureSheetHeaders('VENDORS');
    var vendors = getAllRows(SHEETS.VENDORS);
    vendors.forEach(function(v) {
      if (v.Status !== undefined) v.Status = String(v.Status).toLowerCase().trim();
    });
    return { success: true, vendors: vendors };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getAllApplications(adminToken) {
  var auth = checkAdminAuth(adminToken);
  if (auth) return auth;
  try {
    ensureSheetHeaders('APPLICATIONS');
    ensureSheetHeaders('VENDORS');
    var apps = getAllRows(SHEETS.APPLICATIONS);
    var vendors = getAllRows(SHEETS.VENDORS);
    var byVendorId = {};
    apps.forEach(function(a) {
      if (a.VendorID) byVendorId[a.VendorID] = a;
    });
    vendors.forEach(function(v) {
      var status = String(v.Status || '').toLowerCase().trim();
      if (status === 'pending' && v.VendorID && !byVendorId[v.VendorID]) {
        var synced = vendorToApplicationRow(v);
        apps.push(synced);
        byVendorId[v.VendorID] = synced;
      }
    });
    apps.sort(function(a, b) {
      return String(b.SubmittedAt || '').localeCompare(String(a.SubmittedAt || ''));
    });
    return { success: true, applications: apps, pendingCount: apps.filter(function(a) { return a.Status === 'pending'; }).length };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function adminSetVendorPlan(vendorId, planId, adminToken) {
  var auth = checkAdminAuth(adminToken);
  if (auth) return auth;
  try {
    activatePlan(vendorId, planId, 'manual');
    return { success: true, plan: planId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── Products ──────────────────────────────────────────────────
function getVendorProducts(vendorId) {
  try {
    return { success: true, products: getAllRows(SHEETS.PRODUCTS).filter(function(p) { return p.VendorID === vendorId; }) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function addProduct(data) {
  try {
    var vendor = getRowByField(SHEETS.VENDORS, 'VendorID', data.vendorId);
    if (vendor) {
      var plan = getPlanLimits(vendor.Plan || 'free');
      var count = getAllRows(SHEETS.PRODUCTS).filter(function(p) { return p.VendorID === data.vendorId; }).length;
      if (plan.maxProducts > 0 && count >= plan.maxProducts) {
        return { success: false, error: 'Product limit reached. Upgrade to Pro for unlimited products.' };
      }
    }
    var productId = generateId('PRD');
    var now = new Date().toISOString();
    getSheet(SHEETS.PRODUCTS).appendRow([
      productId, data.vendorId, data.title, data.description || '', data.price || 0,
      data.discountPrice || '', processMediaArray(data.images || [], productId),
      data.category || '', 0, 0, now, now
    ]);
    return { success: true, productId: productId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function updateProduct(productId, data) {
  try {
    var row = getRowByField(SHEETS.PRODUCTS, 'ProductID', productId);
    if (!row) return { success: false, error: 'Product not found' };
    if (data.title) setField(SHEETS.PRODUCTS, row._rowIndex, 'Title', data.title);
    if (data.description !== undefined) setField(SHEETS.PRODUCTS, row._rowIndex, 'Description', data.description);
    if (data.price !== undefined) setField(SHEETS.PRODUCTS, row._rowIndex, 'Price', data.price);
    if (data.discountPrice !== undefined) setField(SHEETS.PRODUCTS, row._rowIndex, 'DiscountPrice', data.discountPrice);
    if (data.category) setField(SHEETS.PRODUCTS, row._rowIndex, 'Category', data.category);
    if (data.images) setField(SHEETS.PRODUCTS, row._rowIndex, 'Images', processMediaArray(data.images, productId));
    setField(SHEETS.PRODUCTS, row._rowIndex, 'UpdatedAt', new Date().toISOString());
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function deleteProduct(productId) {
  try {
    var row = getRowByField(SHEETS.PRODUCTS, 'ProductID', productId);
    if (!row) return { success: false, error: 'Product not found' };
    getSheet(SHEETS.PRODUCTS).deleteRow(row._rowIndex);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function bulkAddProducts(vendorId, products) {
  try {
    var results = [];
    (products || []).forEach(function(p) {
      results.push(addProduct({ vendorId: vendorId, title: p.title, description: p.description, price: p.price, category: p.category, images: p.images || [] }));
    });
    return { success: true, results: results };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── Leads ─────────────────────────────────────────────────────
function saveLead(data) {
  try {
    var leadId = generateId('LD');
    var now = new Date().toISOString();
    getSheet(SHEETS.LEADS).appendRow([
      leadId, data.vendorId, data.customerName, data.phone,
      data.requirement || '', 'new', data.source || 'form', now, now
    ]);
    incrementAnalytics(data.vendorId, 'Leads', data.trafficSource || '');
    return { success: true, leadId: leadId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getVendorLeads(vendorId) {
  try {
    return { success: true, leads: getAllRows(SHEETS.LEADS).filter(function(l) { return l.VendorID === vendorId; }) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getAllLeads(adminToken) {
  var auth = checkAdminAuth(adminToken);
  if (auth) return auth;
  try {
    return { success: true, leads: getAllRows(SHEETS.LEADS) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function updateLeadStatus(leadId, status) {
  try {
    var row = getRowByField(SHEETS.LEADS, 'LeadID', leadId);
    if (!row) return { success: false, error: 'Lead not found' };
    setField(SHEETS.LEADS, row._rowIndex, 'Status', status);
    setField(SHEETS.LEADS, row._rowIndex, 'UpdatedAt', new Date().toISOString());
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function exportLeadsCSV(vendorId) {
  try {
    var leads = getAllRows(SHEETS.LEADS).filter(function(l) { return l.VendorID === vendorId; });
    var csv = 'Name,Phone,Requirement,Status,Date\n';
    leads.forEach(function(l) {
      csv += '"' + l.CustomerName + '","' + l.Phone + '","' + (l.Requirement || '').replace(/"/g, '""') + '","' + l.Status + '","' + l.CreatedAt + '"\n';
    });
    return { success: true, csv: csv };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── Analytics ─────────────────────────────────────────────────
function incrementAnalytics(vendorId, field, trafficSource) {
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var sheet = getSheet(SHEETS.ANALYTICS);
  var data = sheet.getDataRange().getValues();
  var colMap = getColMap(SHEETS.ANALYTICS);

  for (var i = 1; i < data.length; i++) {
    if (data[i][colMap.VendorID - 1] === vendorId && data[i][colMap.Date - 1] === today) {
      var fieldCol = { Views: 'Views', WhatsappClicks: 'WhatsappClicks', Calls: 'Calls', Leads: 'Leads' }[field];
      if (fieldCol && colMap[fieldCol]) {
        var cur = Number(data[i][colMap[fieldCol] - 1]) || 0;
        sheet.getRange(i + 1, colMap[fieldCol]).setValue(cur + 1);
      }
      if (field === 'Views' && colMap.UniqueVisitors) {
        var uv = Number(data[i][colMap.UniqueVisitors - 1]) || 0;
        sheet.getRange(i + 1, colMap.UniqueVisitors).setValue(uv + 1);
      }
      if (trafficSource && colMap.TrafficSource) {
        sheet.getRange(i + 1, colMap.TrafficSource).setValue(trafficSource);
      }
      return;
    }
  }

  var row = [];
  var headers = HEADERS.ANALYTICS;
  headers.forEach(function(h) {
    if (h === 'RecordID') row.push(generateId('AN'));
    else if (h === 'VendorID') row.push(vendorId);
    else if (h === 'Views') row.push(field === 'Views' ? 1 : 0);
    else if (h === 'UniqueVisitors') row.push(field === 'Views' ? 1 : 0);
    else if (h === 'WhatsappClicks') row.push(field === 'WhatsappClicks' ? 1 : 0);
    else if (h === 'Calls') row.push(field === 'Calls' ? 1 : 0);
    else if (h === 'Leads') row.push(field === 'Leads' ? 1 : 0);
    else if (h === 'TrafficSource') row.push(trafficSource || '');
    else if (h === 'Date') row.push(today);
    else row.push('');
  });
  sheet.appendRow(row);
}

function recordView(vendorId, trafficSource) {
  try { incrementAnalytics(vendorId, 'Views', trafficSource || ''); return { success: true }; }
  catch (e) { return { success: false, error: e.message }; }
}

function recordWhatsappClick(vendorId) {
  try { incrementAnalytics(vendorId, 'WhatsappClicks'); return { success: true }; }
  catch (e) { return { success: false, error: e.message }; }
}

function recordCallClick(vendorId) {
  try { incrementAnalytics(vendorId, 'Calls'); return { success: true }; }
  catch (e) { return { success: false, error: e.message }; }
}

function getAnalytics(vendorId) { return getVendorAnalytics(vendorId); }

function getVendorAnalytics(vendorId) {
  try {
    var analytics = getAllRows(SHEETS.ANALYTICS).filter(function(a) { return a.VendorID === vendorId; });
    var totals = { views: 0, uniqueVisitors: 0, whatsappClicks: 0, calls: 0, leads: 0 };
    analytics.forEach(function(a) {
      totals.views += Number(a.Views) || 0;
      totals.uniqueVisitors += Number(a.UniqueVisitors) || 0;
      totals.whatsappClicks += Number(a.WhatsappClicks) || 0;
      totals.calls += Number(a.Calls) || 0;
      totals.leads += Number(a.Leads) || 0;
    });
    var products = getAllRows(SHEETS.PRODUCTS).filter(function(p) { return p.VendorID === vendorId; });
    var vendor = getRowByField(SHEETS.VENDORS, 'VendorID', vendorId);
    var payments = getAllRows(SHEETS.PAYMENTS).filter(function(p) {
      return p.VendorID === vendorId && p.Status === 'captured';
    });
    var revenue = payments.reduce(function(s, p) { return s + (Number(p.Amount) || 0); }, 0);

    return {
      success: true,
      totals: totals,
      daily: analytics,
      monthly: groupAnalyticsByMonth(analytics),
      productCount: products.length,
      topProducts: products.sort(function(a, b) { return (Number(b.Views) || 0) - (Number(a.Views) || 0); }).slice(0, 10),
      trafficSources: getTrafficSources(analytics),
      revenue: revenue,
      plan: vendor ? (vendor.Plan || 'free') : 'free'
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function groupAnalyticsByMonth(analytics) {
  var months = {};
  analytics.forEach(function(a) {
    var m = String(a.Date || '').substring(0, 7);
    if (!m) return;
    if (!months[m]) months[m] = { month: m, views: 0, leads: 0 };
    months[m].views += Number(a.Views) || 0;
    months[m].leads += Number(a.Leads) || 0;
  });
  return Object.keys(months).sort().map(function(k) { return months[k]; });
}

function getTrafficSources(analytics) {
  var sources = {};
  analytics.forEach(function(a) {
    var s = a.TrafficSource || 'direct';
    sources[s] = (sources[s] || 0) + (Number(a.Views) || 0);
  });
  return sources;
}

function getRevenueData() {
  var payments = getAllRows(SHEETS.PAYMENTS).filter(function(p) { return p.Status === 'captured'; });
  var total = payments.reduce(function(s, p) { return s + (Number(p.Amount) || 0); }, 0);
  var byPlan = { free: 0, pro: 0, proplus: 0 };
  var byMonth = {};
  payments.forEach(function(p) {
    var plan = p.Plan || 'pro';
    if (byPlan[plan] !== undefined) byPlan[plan] += Number(p.Amount) || 0;
    var m = String(p.Date || '').substring(0, 7);
    if (m) byMonth[m] = (byMonth[m] || 0) + (Number(p.Amount) || 0);
  });
  return { success: true, totalRevenue: total, byPlan: byPlan, byMonth: byMonth, payments: payments };
}

function getRevenueAnalytics(adminToken) {
  var auth = checkAdminAuth(adminToken);
  if (auth) return auth;
  try {
    return getRevenueData();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getAdminStats(adminToken) {
  var auth = checkAdminAuth(adminToken);
  if (auth) return auth;
  try {
    var vendors = getAllRows(SHEETS.VENDORS);
    var leads = getAllRows(SHEETS.LEADS);
    var analytics = getAllRows(SHEETS.ANALYTICS);
    var revenue = getRevenueData();
    var totalViews = analytics.reduce(function(s, a) { return s + (Number(a.Views) || 0); }, 0);
    var topVendors = vendors.filter(function(v) { return v.Status === 'active'; }).slice(0, 5);

    return {
      success: true,
      stats: {
        totalVendors: vendors.length,
        pendingApprovals: vendors.filter(function(v) { return v.Status === 'pending'; }).length,
        activeShops: vendors.filter(function(v) { return v.Status === 'active'; }).length,
        totalLeads: leads.length,
        totalViews: totalViews,
        totalRevenue: revenue.success ? revenue.totalRevenue : 0,
        planBreakdown: {
          free: vendors.filter(function(v) { return (v.Plan || 'free') === 'free'; }).length,
          pro: vendors.filter(function(v) { return v.Plan === 'pro'; }).length,
          proplus: vendors.filter(function(v) { return v.Plan === 'proplus'; }).length
        }
      },
      topVendors: topVendors
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── QR & URL ──────────────────────────────────────────────────
function generateQRCode(vendorId) {
  try {
    var vendor = getRowByField(SHEETS.VENDORS, 'VendorID', vendorId);
    if (!vendor) return { success: false, error: 'Vendor not found' };
    var url = getWebAppUrl() + '?page=shop&shop=' + vendor.ShopSlug;
    return { success: true, url: url, slug: vendor.ShopSlug };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getWebAppUrl() {
  try { return ScriptApp.getService().getUrl() || ''; } catch (e) { return ''; }
}

// ─── Showcase Form ─────────────────────────────────────────────
function submitShowcaseForm(data) {
  try {
    initializeSheets();
    if (data.honeypot && String(data.honeypot).trim()) return { success: true, spam: true };
    var fullName = String(data.fullname || '').trim();
    var message = String(data.message || '').trim();
    if (!fullName || !message) return { success: false, error: 'Required fields missing' };
    var id = generateId('SF');
    getSheet(SHEETS.SHOWCASE_FORMS).appendRow([
      id, data.form_id || 'hero_form_v3', fullName, data.phone || '', data.email || '',
      data.service || '', message, data.source || '', data.prior_payment || '',
      data.evidence_consent === 'on', data.referrer_url || '', data.landing_page || '',
      data.utm_source || '', data.utm_medium || '', data.utm_campaign || '',
      data.confusion_referral_flag || '', data.confusion_instance || '', data.form_token || '',
      'new', new Date().toISOString()
    ]);
    return { success: true, submissionId: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getAllShowcaseSubmissions() {
  return { success: true, submissions: getAllRows(SHEETS.SHOWCASE_FORMS) };
}

function parseJSONSafe(str, fallback) {
  try { return JSON.parse(str); } catch (e) { return fallback; }
}

// ─── Hubble Gift Cards SDK (JWT SSO) ───────────────────────────
// Run installHubbleKeys() ONCE in Apps Script editor after deploy.
// Private key is stored in Script Properties — never expose to the frontend.

var HUBBLE_CLIENT_ID_DEFAULT = 'instahelp-sdk-1z4JmIpo';
var HUBBLE_APP_SECRET_DEFAULT = 'Ppo5udAi9CDXlN8nlPZoH8myUwAwsa7UgsKcxvxTeXrWZHhPMqACBhr7e4FDsaN4';
var HUBBLE_SDK_BASE_URL = 'https://sdk.myhubble.money/';

function getHubbleClientId() {
  return PropertiesService.getScriptProperties().getProperty('HUBBLE_CLIENT_ID') || HUBBLE_CLIENT_ID_DEFAULT;
}

function getHubbleAppSecret() {
  return PropertiesService.getScriptProperties().getProperty('HUBBLE_APP_SECRET') || HUBBLE_APP_SECRET_DEFAULT;
}

function getHubblePrivateKeyPem() {
  var key = PropertiesService.getScriptProperties().getProperty('HUBBLE_PRIVATE_KEY');
  if (!key) key = getHubblePrivateKeyPkcs8Default();
  return normalizeHubblePrivateKeyForGas(key);
}

/** GAS computeRsaSha256Signature requires PKCS#8 (BEGIN PRIVATE KEY), not PKCS#1 RSA key. */
function normalizeHubblePrivateKeyForGas(pem) {
  pem = String(pem || '').replace(/\\n/g, '\n').trim();
  if (pem.indexOf('BEGIN RSA PRIVATE KEY') !== -1) {
    return getHubblePrivateKeyPkcs8Default();
  }
  if (pem.indexOf('BEGIN PRIVATE KEY') === -1) {
    throw new Error('Hubble private key must be PKCS#8 PEM. Run installHubbleKeys() in Apps Script.');
  }
  return pem;
}

function getHubblePrivateKeyPkcs8Default() {
  return (
    '-----BEGIN PRIVATE KEY-----\n' +
    'MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDDC2WxbMKFFZfD\n' +
    '7w4WbWrYASYYo7/ablQ7jvk2hu/i1ssn7RKaUyfZZbDc1svYpATQDgmj8S3ugLWW\n' +
    'utigu6r/YXeK0COj2XaA97kEJPCj5hzXY0qThvJEXDZJv3eAFmHj7dc/LQlMvabR\n' +
    'fZjFTBuymEPjnSdbWfnQrKyh//P8Fda4LDNat75neY6ezko7gRS44jHZS3thHfjm\n' +
    'MCWAHUdlElSRpd83ocxb62FqArGkswujeBKzV/FMvapBx5tnkBf07J5Ywq3ei28f\n' +
    'GmC2dfcmWxT0+ZEN7SzT5DKbiL6yUoWzOHgmwpArtxf1EVfp07uihZXi3D58oYvJ\n' +
    'cnzZIxPNAgMBAAECggEAI+XPG66mxpPI0PkIoLwWtBbSCirpPqybuDKCT7TaJefe\n' +
    'kESj7d9sMCj1OlAWSJM3h4tt3sye5Yyu30UYZczklgg8VkIkrR1zIB134fliiOfr\n' +
    'WwEdUrW9lTNbkos41UxJTAgUW75QPd2R/HCfU4DEgERiClx8R+XxgqSlSVOwdi7E\n' +
    'bVc9aQUPBBXpW3a/WpK7Gk4fCvD2Ea4Q8yrwzbN4Ln8OXyIgQs4K90zWkkn6uwwu\n' +
    'L1VjJ46EVF8OksbrG3mEp3W+ecv/9uHR5o03Vmz3eineibWQkFegbZgqTyfT6joQ\n' +
    'fmTtgeTAoWgsX9bC93HTbC/O1y9JVR041boGIPoygQKBgQDrrcwlyYQVEqMJyEkG\n' +
    'v07UbxIhcD3UfhiDsfYV0KeQFqp+IEyWhvoAzM3GxgV6t6+n61uIbc33wN50Kn4q\n' +
    'T/UInW8b5eFv4djP9i6j3g+lbGVuKEF2E7OPmlk/Mgys6VnsrsWK4+pME+9Eisbj\n' +
    'ccP+4kSfHiyWJo5LadMPengGvQKBgQDT3Kqd97PETbrFKLJIbGdxzWqAXSsBCAhU\n' +
    'tKHjW1LIy5la9ZqqbTM9VPeIETHJAgFeS9ZdQeU9MEiWiO3ioWtC794p3vDTTFVk\n' +
    'BdXsDetZ7+yNjW2P4SJ2yLSCQwZBXgvwPKlYrY1K90qRfoOdTIk+5PHR/OI+a+x/\n' +
    'g9rFjdzaUQKBgQCAZVbq3zZOJLEeCzd9rYvMwBYokXWd5nSEitd+WwZuwWpw/De9\n' +
    'ahuZg/o3aHpjuN7BpL9hPDER4MlQkDXb52OfJeX6VOrUgT4VThFqxPfRL5Syxsuj\n' +
    'AGi6u2QTwbiWGysafrywRirG97VKqjBgiQI2Qh8QcOfphWfQPf72V8o8IQKBgQCU\n' +
    'DF76Fo97vSmn/wFe1MoQ34/t9a1Igjl4H+YE/9tAz+3xfzG+qKKm2EpFvmZA5fLY\n' +
    '1zwMXTD5alU/RJ6fwVc4JnDkZ5N4xJ3jUKSl2TA+4Ac4/7yxT40K3sQtRvMHGNZU\n' +
    '4b8hZd4Xpelo9LS6ZjJ+TfSiXgonvrk8foKRjMnpkQKBgQCexh+HTlHH9DPYeHzY\n' +
    'xflexIBKBLmNbzx8XTpomn46BhLyNtT4pljwobOrVY9M/RKTWo9mhhR6oeiTlm/B\n' +
    'koL+Ocec6wkxMJyKpFX16WkbDK0omltK5jU2yLJ+C1a/22YjECeZVBeJxNQkUL7D\n' +
    'aja7IOW0yD5b5oy/3j16IFlSMA==\n' +
    '-----END PRIVATE KEY-----'
  );
}

/** Run once (or again after key format fix): Apps Script → Run → installHubbleKeys */
function installHubbleKeys() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('HUBBLE_CLIENT_ID', HUBBLE_CLIENT_ID_DEFAULT);
  props.setProperty('HUBBLE_APP_SECRET', HUBBLE_APP_SECRET_DEFAULT);
  props.setProperty('HUBBLE_PRIVATE_KEY', getHubblePrivateKeyPkcs8Default());
  return { success: true, message: 'Hubble credentials saved (PKCS#8 private key)' };
}

function normalizeHubblePhone(phone) {
  var digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.indexOf('91') === 0) digits = digits.slice(2);
  if (digits.length === 11 && digits.charAt(0) === '0') digits = digits.slice(1);
  return digits;
}

function base64UrlEncode(input) {
  var bytes = (typeof input === 'string') ? Utilities.newBlob(input).getBytes() : input;
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function createHubbleJwtRS256(payload) {
  var header = { alg: 'RS256', typ: 'JWT' };
  var encHeader = base64UrlEncode(JSON.stringify(header));
  var encPayload = base64UrlEncode(JSON.stringify(payload));
  var signingInput = encHeader + '.' + encPayload;
  var signature = Utilities.computeRsaSha256Signature(signingInput, getHubblePrivateKeyPem());
  return signingInput + '.' + base64UrlEncode(signature);
}

function buildHubbleSdkUrl(token) {
  var base = HUBBLE_SDK_BASE_URL;
  if (base.charAt(base.length - 1) !== '/') base += '/';
  return base + '?clientId=' + encodeURIComponent(getHubbleClientId())
    + '&appSecret=' + encodeURIComponent(getHubbleAppSecret())
    + '&token=' + encodeURIComponent(token);
}

function getHubbleSsoToken(profile) {
  try {
    profile = profile || {};
    var phone = normalizeHubblePhone(profile.phoneNumber || profile.phone || '');
    if (phone.length !== 10) {
      return { success: false, error: 'Enter a valid 10-digit mobile number' };
    }
    var now = Math.floor(new Date().getTime() / 1000);
    var payload = {
      sub: String(profile.sub || profile.userId || ('ih_' + phone)),
      iss: getHubbleClientId(),
      iat: now,
      exp: now + 60,
      phoneNumber: phone
    };
    if (profile.name) payload.name = String(profile.name).trim();
    if (profile.email) payload.email = String(profile.email).trim();
    if (profile.cohorts && profile.cohorts.length) payload.cohorts = profile.cohorts;

    var token = createHubbleJwtRS256(payload);
    return {
      success: true,
      sdkUrl: buildHubbleSdkUrl(token),
      expiresIn: 60
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function requestChanges(vendorId, notes) {
  var row = getRowByField(SHEETS.VENDORS, 'VendorID', vendorId);
  if (row) setField(SHEETS.VENDORS, row._rowIndex, 'Status', 'changes_requested');
  return { success: true };
}

function broadcastNotification(message, type) {
  var count = getAllRows(SHEETS.VENDORS).filter(function(v) { return v.Status === 'active'; }).length;
  Logger.log('Broadcast [' + type + '] to ' + count + ': ' + message);
  return { success: true, recipientCount: count };
}
