/**
 * Resolves asset paths for Vercel (/), nested routes, and local file:// preview.
 */
(function() {
  'use strict';

  var base = '/';
  if (window.location.protocol === 'file:') {
    var href = window.location.href.split('#')[0].split('?')[0];
    base = href.slice(0, href.lastIndexOf('/') + 1);
  }

  var existing = document.querySelector('base[data-ih-base]');
  if (existing) {
    existing.href = base;
  } else {
    var el = document.createElement('base');
    el.setAttribute('data-ih-base', '');
    el.href = base;
    var head = document.head || document.getElementsByTagName('head')[0];
    head.insertBefore(el, head.firstChild);
  }

  window.INSTAHELP_BASE = base;
})();
