window.INSTAHELP_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/AKfycbzfBuJzx20OmkPF5bkI8POEeMgF_wfLbyHllLDKASf4M3Wrel3HOSkDdkSYJmphjhLNVg/exec',
  siteName: 'InstaHelp',
  getAppRoot: function() {
    var base = window.INSTAHELP_BASE || '/';
    return base.endsWith('/') ? base : base + '/';
  },
  path: function(route) {
    var r = route || '';
    if (r.charAt(0) === '/') r = r.slice(1);
    return this.getAppRoot() + r;
  },
  getSiteUrl: function() {
    return window.location.origin + this.getAppRoot();
  },
  getShopUrl: function(slug) {
    return window.location.origin + '/shop/' + encodeURIComponent(slug);
  },
  getDashboardUrl: function(vendorId) {
    return window.location.origin + '/vendor/dashboard?vendorId=' + encodeURIComponent(vendorId);
  },
  routes: {
    home: '/',
    register: '/vendors/apply',
    dashboard: '/vendor/dashboard',
    admin: '/admin/vendors'
  }
};
