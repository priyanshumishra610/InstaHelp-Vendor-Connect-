var StoreTemplates = (function() {
  function esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function fmt(n) { return n ? '₹' + Number(n).toLocaleString('en-IN') : ''; }
  function imgs(p) { try { return JSON.parse(p.Images || '[]'); } catch(e) { return []; } }
  function gallery(v) { try { return JSON.parse(v.Gallery || '[]'); } catch(e) { return []; } }
  function isVerified(v) { return v.Verified === true || v.Verified === 'TRUE'; }
  function jsTitle(t) { return esc(t).replace(/'/g, "\\'"); }
  function waLogo() {
    return '<svg class="wa-logo" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
  }

  function contactBtns(v, id, cls) {
    cls = cls || 'store-btn';
    return '<button type="button" class="' + cls + ' store-btn-wa" onclick="StoreActions.whatsapp(\'' + id + '\')">' + waLogo() + ' WhatsApp</button>' +
           '<button type="button" class="' + cls + ' store-btn-call" onclick="StoreActions.call(\'' + id + '\')">Call</button>';
  }

  function enquiryForm(vendorId) {
    return '<section class="store-enquiry" id="enquiry"><div class="store-container store-enquiry-grid">' +
      '<div><h2>Send a request</h2><p>Share what you need. The vendor replies on WhatsApp or phone.</p></div>' +
      '<form id="lead-form" onsubmit="StoreActions.submitLead(event,\'' + vendorId + '\')">' +
      '<label>Name<input name="name" autocomplete="name" required></label>' +
      '<label>Phone<input name="phone" type="tel" inputmode="numeric" autocomplete="tel" required></label>' +
      '<label>What do you need?<textarea name="requirement" rows="3" required></textarea></label>' +
      '<button type="submit" class="store-btn store-btn-primary">Send request</button></form></div></section>';
  }

  function trustSection() {
    return '<div class="store-trust"><div class="store-container store-trust-row">' +
      '<span>On the InstaHelp network</span><span>WhatsApp first</span><span>Live after review</span></div></div>';
  }

  function branding(show) {
    if (!show) return '';
    return '<div class="store-branding">Powered by <a href="/">InstaHelp</a></div>';
  }

  function stickyBar(v, id) {
    return '<div class="store-sticky">' + contactBtns(v, id, 'store-btn') + '</div>';
  }

  function initials(name) {
    var p = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return 'IH';
    return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
  }

  function productCardClassic(p) {
    var im = imgs(p)[0] || '';
    var disc = p.DiscountPrice && Number(p.DiscountPrice) < Number(p.Price);
    return '<article class="product-card">' +
      '<div class="product-img">' + (im ? '<img src="' + im + '" alt="' + esc(p.Title) + '">' : '<div class="product-fallback">' + esc((p.Title || '?').charAt(0)) + '</div>') + '</div>' +
      '<div class="product-body"><h3>' + esc(p.Title) + '</h3>' +
      (p.Description ? '<p>' + esc(p.Description) + '</p>' : '') +
      '<div class="product-meta"><span class="price">' + fmt(disc ? p.DiscountPrice : p.Price) + '</span>' +
      (disc ? '<span class="price-old">' + fmt(p.Price) + '</span>' : '') + '</div>' +
      '<button type="button" class="store-btn store-btn-primary" onclick="StoreActions.enquire(\'' + jsTitle(p.Title) + '\')">Ask about this</button></div></article>';
  }

  function renderClassic(store) {
    var v = store.vendor, id = v.VendorID, prods = store.products;
    var cats = {}; prods.forEach(function(p) { if (p.Category) cats[p.Category] = 1; });
    var catHtml = Object.keys(cats).map(function(c) { return '<span class="cat-pill">' + esc(c) + '</span>'; }).join('');
    var prodHtml = prods.map(productCardClassic).join('') || '<p class="empty-note">Listings will appear here after the vendor adds them.</p>';
    var gal = gallery(v);
    var galHtml = gal.length ? '<section class="store-section"><div class="store-container"><h2>Work</h2><div class="gallery-masonry">' + gal.map(function(u){return '<img src="'+u+'" alt="">';}).join('') + '</div></div></section>' : '';
    var loc = [v.City, v.State].filter(Boolean).join(', ');
    var cover = v.CoverBanner ? '<img src="' + v.CoverBanner + '" alt="">' : '<div class="hero-wash"></div>';
    var logo = v.Logo
      ? '<img class="logo" src="' + v.Logo + '" alt="' + esc(v.BusinessName) + ' logo">'
      : '<div class="logo logo-fallback">' + esc(initials(v.BusinessName)) + '</div>';
    var facts = [];
    if (v.YearsInBusiness) facts.push('<div><strong>' + esc(String(v.YearsInBusiness)) + ' yrs</strong><span>In business</span></div>');
    if (v.WorkingHours) facts.push('<div><strong>' + esc(v.WorkingHours) + '</strong><span>Hours</span></div>');
    if (v.ServiceAreas) facts.push('<div><strong>' + esc(v.ServiceAreas) + '</strong><span>Areas</span></div>');
    var factsHtml = facts.length ? '<section class="store-section facts"><div class="store-container facts-row">' + facts.join('') + '</div></section>' : '';

    var colors = store.themeColors || {};
    return '<div class="store-root tpl-classic" style="--store-primary:' + (colors.primary || '#FFD600') + '">' +
      '<header class="hero">' + cover + '<div class="hero-scrim"></div></header>' +
      '<div class="profile">' +
        '<div class="store-container profile-grid">' +
          logo +
          '<div class="profile-copy">' +
            '<h1>' + esc(v.BusinessName) + '</h1>' +
            '<p class="profile-meta">' +
              (isVerified(v) ? '<span class="verified">Verified</span>' : '') +
              (v.Category ? '<span>' + esc(v.Category) + '</span>' : '') +
              (loc ? '<span>' + esc(loc) + '</span>' : '') +
              (v.Rating ? '<span>' + esc(String(v.Rating)) + ' rating</span>' : '') +
            '</p>' +
            (v.Description ? '<p class="profile-lead">' + esc(v.Description) + '</p>' : '') +
          '</div>' +
          '<div class="profile-actions">' + contactBtns(v, id) + '</div>' +
        '</div>' +
      '</div>' +
      factsHtml +
      '<section class="store-section"><div class="store-container">' +
        '<h2>Offerings</h2>' +
        (catHtml ? '<div class="cat-pills">' + catHtml + '</div>' : '') +
        '<div class="product-grid">' + prodHtml + '</div>' +
      '</div></section>' +
      galHtml + enquiryForm(id) + trustSection() + branding(store.showBranding) + stickyBar(v, id) + '</div>';
  }

  function renderLuxury(store) {
    var v = store.vendor, id = v.VendorID, prods = store.products;
    var prodHtml = prods.map(function(p) {
      var im = imgs(p)[0] || '';
      return '<div class="product-card"><div class="product-img">' + (im ? '<img src="'+im+'" alt="'+esc(p.Title)+'">' : '') + '</div>' +
        '<div class="product-body"><h3>' + esc(p.Title) + '</h3>' +
        '<p>' + esc(p.Description) + '</p>' +
        '<p class="lux-price">' + fmt(p.DiscountPrice || p.Price) + '</p>' +
        '<button type="button" class="store-btn store-btn-primary" onclick="StoreActions.enquire(\'' + jsTitle(p.Title) + '\')">Ask about this</button></div></div>';
    }).join('');

    var colors = store.themeColors || {};
    return '<div class="store-root tpl-luxury" style="--store-primary:' + (colors.primary || '#FFD600') + '">' +
      '<div class="hero-full">' + (v.CoverBanner ? '<img src="' + v.CoverBanner + '" alt="">' : '') +
      '<div class="hero-content"><h1>' + esc(v.BusinessName) + '</h1><p>' + esc(v.Description) + '</p>' +
      '<div class="hero-actions">' + contactBtns(v, id) + '</div></div></div>' +
      '<div class="store-section"><div class="store-container"><h2 class="lux-h">Offerings</h2>' +
      '<div class="product-grid">' + (prodHtml || '<p class="empty-note">Listings will appear here after the vendor adds them.</p>') + '</div></div></div>' +
      enquiryForm(id) + branding(store.showBranding) + stickyBar(v, id) + '</div>';
  }

  function renderService(store) {
    var v = store.vendor, id = v.VendorID, prods = store.products;
    var svcHtml = prods.map(function(p) {
      return '<div class="service-card"><div class="service-icon">' + esc((p.Title || 'S').charAt(0)) + '</div>' +
        '<h3>' + esc(p.Title) + '</h3>' +
        '<p>' + esc(p.Description) + '</p>' +
        '<div class="svc-foot"><strong>' + fmt(p.DiscountPrice || p.Price) + '</strong>' +
        '<button type="button" class="store-btn store-btn-primary" onclick="StoreActions.enquire(\'' + jsTitle(p.Title) + '\')">Book</button></div></div>';
    }).join('');

    var colors = store.themeColors || {};
    return '<div class="store-root tpl-service" style="--store-primary:' + (colors.primary || '#FFD600') + ';--store-accent:' + (colors.accent || '#0F0F0F') + '">' +
      '<div class="hero"><div class="store-container"><div class="hero-inner">' +
      (v.Logo ? '<img class="hero-logo" src="'+v.Logo+'" alt="">' : '') +
      '<div><h1>' + esc(v.BusinessName) + '</h1>' +
      (isVerified(v) ? '<span class="verified">Verified</span> ' : '') +
      '<p class="svc-loc">' + esc(v.City) + (v.Rating ? '  ' + esc(String(v.Rating)) + ' rating' : '') + '</p>' +
      '<p class="svc-desc">' + esc(v.Description) + '</p>' +
      '<div class="hero-actions">' + contactBtns(v, id) + '</div></div></div></div></div>' +
      '<div class="store-section"><div class="store-container"><h2>Services</h2><div class="service-grid">' + (svcHtml || '<p class="empty-note">No services listed yet.</p>') + '</div></div></div>' +
      enquiryForm(id) + branding(store.showBranding) + stickyBar(v, id) + '</div>';
  }

  function renderTravel(store) {
    var v = store.vendor, id = v.VendorID, prods = store.products;
    var destHtml = prods.map(function(p) {
      var im = imgs(p)[0] || v.CoverBanner || '';
      return '<div class="dest-card" onclick="StoreActions.enquire(\'' + jsTitle(p.Title) + '\')">' +
        (im ? '<img src="'+im+'" alt="'+esc(p.Title)+'">' : '<div class="dest-empty"></div>') +
        '<div class="dest-info"><h3>' + esc(p.Title) + '</h3>' +
        '<p>' + esc(p.Description) + '</p>' +
        '<strong>' + fmt(p.DiscountPrice || p.Price) + '</strong></div></div>';
    }).join('');
    var gal = gallery(v);
    var galHtml = gal.length ? '<div class="store-section"><div class="store-container"><h2>Gallery</h2><div class="gallery-row">' + gal.slice(0,8).map(function(u){return '<img src="'+u+'" alt="">';}).join('') + '</div></div></div>' : '';

    var colors = store.themeColors || {};
    return '<div class="store-root tpl-travel" style="--store-primary:' + (colors.primary || '#FFD600') + '">' +
      '<div class="hero">' + (v.CoverBanner ? '<img src="'+v.CoverBanner+'" alt="">' : '<div class="travel-wash"></div>') +
      '<div class="hero-overlay"><div><h1>' + esc(v.BusinessName) + '</h1>' +
      '<p>' + esc(v.City) + (v.State ? ', ' + esc(v.State) : '') + '</p></div></div></div>' +
      '<div class="store-section"><div class="store-container travel-toolbar">' +
      '<div>' + (isVerified(v) ? '<span class="verified">Verified</span> ' : '') +
      (v.Rating ? '<span>' + esc(String(v.Rating)) + ' rating</span>' : '') + '</div>' +
      '<div class="hero-actions">' + contactBtns(v, id) + '</div></div>' +
      '<div class="store-container"><h2>Packages</h2><div class="dest-grid">' + (destHtml || '<p class="empty-note">No packages yet.</p>') + '</div></div></div>' +
      '<div class="store-section travel-about"><div class="store-container"><h2>About</h2><p>' + esc(v.Description) + '</p></div></div>' +
      galHtml + enquiryForm(id) + branding(store.showBranding) + stickyBar(v, id) + '</div>';
  }

  var renderers = { classic: renderClassic, luxury: renderLuxury, service: renderService, travel: renderTravel };

  return {
    render: function(store) {
      var tpl = store.template || 'classic';
      var fn = renderers[tpl] || renderClassic;
      return fn(store);
    }
  };
})();

var StoreActions = {
  vendorId: null,
  vendorPhone: '',
  setVendor: function(v) {
    this.vendorId = v.VendorID;
    this.vendorPhone = String(v.WhatsApp || v.Phone || '').replace(/\D/g, '');
  },
  whatsapp: function(id) {
    google.script.run.recordWhatsappClick(id || this.vendorId);
    var ph = this.vendorPhone.length === 10 ? '91' + this.vendorPhone : this.vendorPhone;
    window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent('Hi, I found your store on InstaHelp.'), '_blank');
  },
  call: function(id) {
    google.script.run.recordCallClick(id || this.vendorId);
    window.location.href = 'tel:+' + this.vendorPhone;
  },
  enquire: function(title) {
    var form = document.getElementById('lead-form');
    if (form) {
      var ta = form.querySelector('[name="requirement"]');
      if (ta) ta.value = 'Interested in: ' + title;
      document.getElementById('enquiry').scrollIntoView({ behavior: 'smooth' });
    }
  },
  submitLead: function(e, vendorId) {
    e.preventDefault();
    var form = e.target;
    var btn = form.querySelector('[type="submit"]');
    btn.disabled = true; btn.textContent = 'Sending';
    var src = InstaHelp.getQueryParam('utm_source') || document.referrer || 'direct';
    google.script.run
      .withSuccessHandler(function(res) {
        btn.disabled = false;
        if (res.success) { btn.textContent = 'Sent'; form.reset(); InstaHelp.toast('Request sent', 'success'); }
        else { btn.textContent = 'Send request'; InstaHelp.toast(res.error || 'Could not send', 'error'); }
      })
      .withFailureHandler(function(err) { btn.disabled = false; btn.textContent = 'Send request'; InstaHelp.toast(err.message, 'error'); })
      .saveLead({ vendorId: vendorId, customerName: form.name.value, phone: form.phone.value, requirement: form.requirement.value, source: 'store', trafficSource: src });
  }
};
