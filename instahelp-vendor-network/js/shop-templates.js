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
    return '<section class="store-enquiry" id="enquiry"><div class="store-container">' +
      '<div class="enquiry-box"><h2>Have a question?</h2>' +
      '<p>The seller replies on WhatsApp or phone.</p>' +
      '<form id="lead-form" onsubmit="StoreActions.submitLead(event,\'' + vendorId + '\')">' +
      '<div class="enquiry-row"><label>Name<input name="name" autocomplete="name" required></label>' +
      '<label>Phone<input name="phone" type="tel" inputmode="numeric" autocomplete="tel" required></label></div>' +
      '<label>Requirement<textarea name="requirement" rows="3" required></textarea></label>' +
      '<button type="submit" class="store-btn store-btn-primary">Send request</button></form></div></div></section>';
  }

  function trustSection() {
    return '<footer class="store-trust"><div class="store-container">Seller listings on the InstaHelp network</div></footer>';
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
    var price = Number(p.Price) || 0;
    var deal = Number(p.DiscountPrice) || 0;
    var disc = deal && price && deal < price;
    var pct = disc ? Math.round((1 - deal / price) * 100) : 0;
    var cat = p.Category || '';
    return '<article class="product-card" data-product-cat="' + esc(cat) + '">' +
      '<button type="button" class="product-hit" onclick="StoreActions.enquire(\'' + jsTitle(p.Title) + '\')">' +
      '<div class="product-img">' + (im ? '<img src="' + im + '" alt="' + esc(p.Title) + '">' : '<div class="product-fallback"></div>') + '</div>' +
      '<div class="product-body"><h3>' + esc(p.Title) + '</h3>' +
      '<div class="price-row">' +
        '<span class="price">' + fmt(disc ? deal : price) + '</span>' +
        (disc ? '<span class="price-old">' + fmt(price) + '</span><span class="price-off">' + pct + '% off</span>' : '') +
      '</div></div></button>' +
      '<button type="button" class="store-btn store-btn-cart" onclick="StoreActions.enquire(\'' + jsTitle(p.Title) + '\')">Enquire</button></article>';
  }

  function renderClassic(store) {
    var v = store.vendor, id = v.VendorID, prods = store.products || [];
    var cats = {}; prods.forEach(function(p) { if (p.Category) cats[p.Category] = 1; });
    var catKeys = Object.keys(cats);
    var catHtml = '<button type="button" class="cat-pill is-on" data-filter="" onclick="StoreActions.filterCat(\'\')">All</button>' +
      catKeys.map(function(c) {
        return '<button type="button" class="cat-pill" data-filter="' + esc(c) + '" onclick="StoreActions.filterCat(\'' + jsTitle(c) + '\')">' + esc(c) + '</button>';
      }).join('');
    var prodHtml = prods.map(productCardClassic).join('') || '<p class="empty-note">No products listed in this store yet.</p>';
    var gal = gallery(v);
    var galHtml = gal.length ? '<section class="mkt-photos"><div class="store-container"><h2>Photos</h2><div class="photo-row">' + gal.map(function(u){return '<img src="'+u+'" alt="">';}).join('') + '</div></div></section>' : '';
    var loc = [v.City, v.State].filter(Boolean).join(', ');
    var cover = v.CoverBanner ? '<img src="' + v.CoverBanner + '" alt="">' : '<div class="banner-fallback"></div>';
    var logo = v.Logo
      ? '<img class="logo" src="' + v.Logo + '" alt="' + esc(v.BusinessName) + ' logo">'
      : '<div class="logo logo-fallback">' + esc(initials(v.BusinessName)) + '</div>';
    var bits = [];
    if (v.WorkingHours) bits.push('Hours: ' + v.WorkingHours);
    if (v.ServiceAreas) bits.push('Delivers / serves: ' + v.ServiceAreas);
    if (v.YearsInBusiness) bits.push(v.YearsInBusiness + ' yrs in business');
    var about = v.Description
      ? '<section class="mkt-about"><div class="store-container"><div class="about-box"><h2>About this seller</h2><p>' + esc(v.Description) + '</p></div></div></section>'
      : '';
    var colors = store.themeColors || {};
    var crumb = ['Store', v.Category, loc].filter(Boolean).join('  /  ');

    return '<div class="store-root tpl-classic" style="--store-primary:' + (colors.primary || '#FFD600') + '">' +
      '<header class="mkt-bar"><div class="store-container mkt-bar-inner">' +
        '<a class="mkt-logo" href="/"><span>IH</span>InstaHelp</a>' +
        '<p class="mkt-crumb">' + esc(crumb) + '</p>' +
        '<div class="mkt-bar-actions">' + contactBtns(v, id) + '</div>' +
      '</div></header>' +
      '<div class="mkt-banner">' + cover + '</div>' +
      '<div class="mkt-seller"><div class="store-container mkt-seller-inner">' +
        logo +
        '<div class="seller-copy">' +
          '<h1>' + esc(v.BusinessName) +
            (isVerified(v) ? '<span class="verified">Verified</span>' : '') +
          '</h1>' +
          '<p class="seller-meta">' +
            (v.Rating ? '<span class="rating"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#FFA41C" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>' + esc(String(v.Rating)) + '</span>' : '') +
            (v.Category ? '<span>' + esc(v.Category) + '</span>' : '') +
            (loc ? '<span>' + esc(loc) + '</span>' : '') +
          '</p>' +
        '</div>' +
      '</div></div>' +
      (catKeys.length ? '<nav class="mkt-cats" aria-label="Categories"><div class="store-container cat-pills">' + catHtml + '</div></nav>' : '') +
      '<section class="mkt-shelf"><div class="store-container">' +
        '<div class="shelf-head"><h2>Products</h2><p data-extra="' + esc(bits.join('  ·  ')) + '">' + prods.length + (prods.length === 1 ? ' item' : ' items') +
          (bits.length ? '  ·  ' + esc(bits.join('  ·  ')) : '') + '</p></div>' +
        '<div class="product-grid">' + prodHtml + '</div>' +
      '</div></section>' +
      galHtml + about + enquiryForm(id) + trustSection() + branding(store.showBranding) + stickyBar(v, id) + '</div>';
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
  filterCat: function(cat) {
    var cards = document.querySelectorAll('[data-product-cat]');
    var n = 0;
    for (var i = 0; i < cards.length; i++) {
      var show = !cat || cards[i].getAttribute('data-product-cat') === cat;
      cards[i].hidden = !show;
      if (show) n++;
    }
    var pills = document.querySelectorAll('.cat-pill');
    for (var j = 0; j < pills.length; j++) {
      pills[j].classList.toggle('is-on', (pills[j].getAttribute('data-filter') || '') === (cat || ''));
    }
    var count = document.querySelector('.tpl-classic .shelf-head p');
    if (count) {
      var extra = count.getAttribute('data-extra') || '';
      count.textContent = n + (n === 1 ? ' item' : ' items') + (extra ? '  ·  ' + extra : '');
    }
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
