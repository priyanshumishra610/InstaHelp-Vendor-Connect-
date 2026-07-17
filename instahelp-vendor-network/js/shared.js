var InstaHelp = (function() {
  'use strict';

  function toast(message, type) {
    var container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    var el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function() { el.remove(); }, 4000);
  }

  function formatCurrency(amount) {
    if (!amount && amount !== 0) return '';
    return '₹' + Number(amount).toLocaleString('en-IN');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatPhone(phone) {
    if (!phone) return '';
    var clean = String(phone).replace(/\D/g, '');
    if (clean.length === 10) return '+91 ' + clean;
    return phone;
  }

  function parseJSON(str, fallback) {
    try { return JSON.parse(str); } catch(e) { return fallback || []; }
  }

  function fileToBase64(file) {
    if (file.type && file.type.indexOf('image/') === 0 && file.type !== 'image/svg+xml') {
      return compressImageFile(file, 1280, 0.72);
    }
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /** Shrink images before upload so registration / Drive saves stay fast. */
  function compressImageFile(file, maxEdge, quality) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function() {
        var img = new Image();
        img.onerror = function() { resolve(reader.result); };
        img.onload = function() {
          var w = img.width;
          var h = img.height;
          var scale = Math.min(1, maxEdge / Math.max(w, h));
          if (scale >= 1 && file.size < 350000) {
            resolve(reader.result);
            return;
          }
          var canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(w * scale));
          canvas.height = Math.max(1, Math.round(h * scale));
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          try {
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch (e) {
            resolve(reader.result);
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function setupUploadZone(zoneId, inputId, previewId, multiple) {
    var zone = document.getElementById(zoneId);
    var input = document.getElementById(inputId);
    var preview = document.getElementById(previewId);
    if (!zone || !input) return;

    zone.addEventListener('click', function() { input.click(); });
    zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', function() { zone.classList.remove('dragover'); });
    zone.addEventListener('drop', function(e) {
      e.preventDefault();
      zone.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });
    input.addEventListener('change', function() { handleFiles(input.files); });

    var files = [];
    function handleFiles(fileList) {
      Array.from(fileList).forEach(function(file) {
        if (!file.type.startsWith('image/') && !file.type.includes('pdf')) return;
        fileToBase64(file).then(function(b64) {
          files.push(b64);
          renderPreview();
        });
      });
    }

    function renderPreview() {
      if (!preview) return;
      preview.innerHTML = files.map(function(f, i) {
        var isPdf = f.indexOf('application/pdf') !== -1;
        return '<div class="upload-preview-item">' +
          (isPdf ? '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:0.75rem;padding:0.5rem;text-align:center">PDF</div>' :
          '<img src="' + f + '" alt="Preview">') +
          '<button type="button" class="upload-preview-remove" data-idx="' + i + '">&times;</button></div>';
      }).join('');
      preview.querySelectorAll('.upload-preview-remove').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          files.splice(Number(btn.dataset.idx), 1);
          renderPreview();
        });
      });
    }

    return {
      getFiles: function() { return multiple ? files : (files[0] || ''); },
      setFiles: function(f) { files = Array.isArray(f) ? f : (f ? [f] : []); renderPreview(); },
      clear: function() { files = []; renderPreview(); }
    };
  }

  function showLoading(el) {
    if (!el) return;
    el.innerHTML = '<div style="padding:3rem;text-align:center"><div class="skeleton" style="width:48px;height:48px;border-radius:50%;margin:0 auto 1rem"></div><div class="skeleton" style="width:200px;height:16px;margin:0 auto"></div></div>';
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
      toast('Copied to clipboard!', 'success');
    });
  }

  function getQueryParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function getShopSlugFromPath() {
    var m = window.location.pathname.match(/\/shop\/([^/?#]+)/);
    if (m) return decodeURIComponent(m[1]);
    return getQueryParam('shop') || getQueryParam('slug') || '';
  }

  function initLucide() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function initTheme() {
    var saved = localStorage.getItem('instahelp-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('instahelp-theme', next);
  }

  function initSidebar() {
    var toggle = document.getElementById('sidebar-toggle');
    var sidebar = document.querySelector('.sidebar');
    if (!toggle || !sidebar) return;
    if (toggle.dataset.sidebarBound === '1') return;
    toggle.dataset.sidebarBound = '1';
    toggle.setAttribute('type', 'button');

    var backdrop = document.getElementById('sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'sidebar-backdrop';
      backdrop.className = 'sidebar-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(backdrop);
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      backdrop.classList.remove('active');
      backdrop.setAttribute('aria-hidden', 'true');
    }

    function openSidebar() {
      sidebar.classList.add('open');
      backdrop.classList.add('active');
      backdrop.setAttribute('aria-hidden', 'false');
    }

    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (sidebar.classList.contains('open')) closeSidebar();
      else openSidebar();
    });

    backdrop.addEventListener('click', closeSidebar);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeSidebar();
    });
  }

  function closeSidebar() {
    var sidebar = document.querySelector('.sidebar');
    var backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) {
      backdrop.classList.remove('active');
      backdrop.setAttribute('aria-hidden', 'true');
    }
  }

  function openModal(id) {
    var modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  }

  function closeModal(id) {
    var modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
  }

  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('active');
    }
    if (e.target.closest('[data-close-modal]')) {
      var modal = e.target.closest('.modal-overlay');
      if (modal) modal.classList.remove('active');
    }
  });

  return {
    toast: toast,
    formatCurrency: formatCurrency,
    formatDate: formatDate,
    formatPhone: formatPhone,
    parseJSON: parseJSON,
    fileToBase64: fileToBase64,
    setupUploadZone: setupUploadZone,
    showLoading: showLoading,
    copyToClipboard: copyToClipboard,
    getQueryParam: getQueryParam,
    getShopSlugFromPath: getShopSlugFromPath,
    initLucide: initLucide,
    initTheme: initTheme,
    toggleTheme: toggleTheme,
    initSidebar: initSidebar,
    closeSidebar: closeSidebar,
    openModal: openModal,
    closeModal: closeModal
  };
})();

document.addEventListener('DOMContentLoaded', function() {
  InstaHelp.initTheme();
  InstaHelp.initSidebar();
  if (typeof lucide !== 'undefined') InstaHelp.initLucide();
});
