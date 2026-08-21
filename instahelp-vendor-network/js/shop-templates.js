var StoreTemplates = (function() {
  function esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function fmt(n) { return n ? '₹' + Number(n).toLocaleString('en-IN') : ''; }
  function imgs(p) { try { return JSON.parse(p.Images || '[]'); } catch(e) { return []; } }
  function gallery(v) { try { return JSON.parse(v.Gallery || '[]'); } catch(e) { return []; } }

  function contactBtns(v, id, cls) {
    cls = cls || 'store-btn';
    return '<button class="' + cls + ' store-btn-wa" onclick="StoreActions.whatsapp(\'' + id + '\')">WhatsApp</button>' +
           '<button class="' + cls + ' store-btn-secondary" onclick="StoreActions.call(\'' + id + '\')">Call</button>';
  }

  function enquiryForm(vendorId) {
    return '<div class="store-enquiry" id="enquiry"><div class="store-container">' +
      '<h2 style="margin-bottom:0.5rem">Get a Free Quote</h2><p style="opacity:0.7;margin-bottom:1.5rem">Tell us what you need</p>' +
      '<form id="lead-form" onsubmit="StoreActions.submitLead(event,\'' + vendorId + '\')">' +
      '<input name="name" placeholder="Your name" required>' +
      '<input name="phone" type="tel" placeholder="Phone number" required>' +
      '<textarea name="requirement" rows="3" placeholder="Your requirement" required></textarea>' +
      '<button type="submit" class="store-btn store-btn-primary" style="width:100%">Submit Enquiry</button></form></div></div>';
  }

  function trustSection() {
    return '<div class="store-container"><div class="store-trust">' +
      '<div><strong>✓ Verified</strong><br><small>Identity verified</small></div>' +
      '<div><strong>🔒 Secure</strong><br><small>Data protected</small></div>' +
      '<div><strong>⚡ Fast</strong><br><small>Quick response</small></div>' +
      '<div><strong>❤️ Trusted</strong><br><small>InstaHelp network</small></div></div></div>';
  }

  function branding(show) {
    if (!show) return '';
    return '<div class="store-branding">Powered by <a href="#">InstaHelp Store Builder</a></div>';
  }

  function stickyBar(v, id) {
    return '<div class="store-sticky">' + contactBtns(v, id, 'store-btn') + '</div>';
  }

  function productCardClassic(p) {
    var im = imgs(p)[0] || '';
    var disc = p.DiscountPrice && Number(p.DiscountPrice) < Number(p.Price);
    return '<div class="product-card"><div class="product-img">' + (im ? '<img src="' + im + '" alt="">' : '') + '</div>' +
      '<div class="product-body"><strong>' + esc(p.Title) + '</strong><p style="font-size:0.8125rem;color:#666;margin:0.375rem 0">' + esc(p.Description) + '</p>' +
      '<span class="price">' + fmt(disc ? p.DiscountPrice : p.Price) + '</span>' + (disc ? '<span class="price-old">' + fmt(p.Price) + '</span>' : '') +
      '<div style="margin-top:0.75rem"><button class="store-btn store-btn-primary" style="width:100%;font-size:0.8125rem" onclick="StoreActions.enquire(\'' + esc(p.Title).replace(/'/g,"\\'") + '\')">Enquire</button></div></div></div>';
  }

  function renderClassic(store) {
    var v = store.vendor, id = v.VendorID, prods = store.products;
    var cats = {}; prods.forEach(function(p) { if (p.Category) cats[p.Category] = 1; });
    var catHtml = Object.keys(cats).map(function(c) { return '<span class="cat-pill">' + esc(c) + '</span>'; }).join('');
    var prodHtml = prods.map(productCardClassic).join('') || '<p style="color:#888">Products coming soon</p>';
    var gal = gallery(v);
    var galHtml = gal.length ? '<div class="store-section"><div class="store-container"><h2>Gallery</h2><div class="gallery-masonry">' + gal.map(function(u){return '<img src="'+u+'" alt="">';}).join('') + '</div></div></div>' : '';

    return '<div class="store-root tpl-classic" style="--store-primary:' + store.themeColors.primary + '">' +
      '<div class="hero-banner">' + (v.CoverBanner ? '<img src="' + v.CoverBanner + '">' : '') + '</div>' +
      '<div class="profile-bar"><div class="store-container"><div class="profile-inner">' +
      (v.Logo ? '<img class="logo" src="' + v.Logo + '">' : '<div class="logo" style="display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.5rem">' + esc(v.BusinessName).charAt(0) + '</div>') +
      '<div style="flex:1"><h1 style="font-size:1.5rem;font-weight:800">' + esc(v.BusinessName) + '</h1>' +
      (v.Verified === true || v.Verified === 'TRUE' ? '<span class="verified">✓ Verified</span> ' : '') +
      '<span style="color:#666;font-size:0.875rem">★ ' + (v.Rating || '4.8') + ' · ' + esc(v.City) + '</span></div>' +
      '<div style="display:flex;gap:0.5rem">' + contactBtns(v, id) + '</div></div></div></div>' +
      '<div class="store-section"><div class="store-container"><h2>Shop by Category</h2><div class="cat-pills">' + (catHtml || '<span class="cat-pill">All Products</span>') + '</div>' +
      '<div class="product-grid">' + prodHtml + '</div></div></div>' +
      '<div class="store-section about-section" style="background:#f8f8f8"><div class="store-container"><h2>About</h2><p style="line-height:1.8;color:#444">' + esc(v.Description) + '</p>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:1.5rem">' +
      '<div><small style="color:#888">Experience</small><br><strong>' + (v.YearsInBusiness || '—') + ' years</strong></div>' +
      '<div><small style="color:#888">Hours</small><br><strong>' + esc(v.WorkingHours || '—') + '</strong></div>' +
      '<div><small style="color:#888">Areas</small><br><strong>' + esc(v.ServiceAreas || '—') + '</strong></div></div></div></div>' +
      galHtml + enquiryForm(id) + trustSection() + branding(store.showBranding) + stickyBar(v, id) + '</div>';
  }

  function renderLuxury(store) {
    var v = store.vendor, id = v.VendorID, prods = store.products;
    var prodHtml = prods.map(function(p) {
      var im = imgs(p)[0] || '';
      return '<div class="product-card"><div class="product-img">' + (im ? '<img src="'+im+'">' : '') + '</div>' +
        '<div class="product-body"><h3 style="font-size:1.25rem;font-weight:600">' + esc(p.Title) + '</h3>' +
        '<p style="color:rgba(255,255,255,0.6);font-size:0.875rem;margin:0.5rem 0">' + esc(p.Description) + '</p>' +
        '<p style="font-size:1.5rem;font-weight:700">' + fmt(p.DiscountPrice || p.Price) + '</p>' +
        '<button class="store-btn store-btn-primary" onclick="StoreActions.enquire(\'' + esc(p.Title).replace(/'/g,"\\'") + '\')">Learn More</button></div></div>';
    }).join('');

    return '<div class="store-root tpl-luxury" style="--store-primary:' + store.themeColors.primary + '">' +
      '<div class="hero-full">' + (v.CoverBanner ? '<img src="' + v.CoverBanner + '">' : '') +
      '<div class="hero-content"><h1>' + esc(v.BusinessName) + '</h1><p>' + esc(v.Description) + '</p>' +
      '<div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap">' + contactBtns(v, id) + '</div></div></div>' +
      '<div class="store-section"><div class="store-container"><h2 style="font-size:2rem;font-weight:700;margin-bottom:2rem;text-align:center">Our Offerings</h2>' +
      '<div class="product-grid">' + (prodHtml || '<p style="text-align:center;opacity:0.5">Coming soon</p>') + '</div></div></div>' +
      enquiryForm(id) + branding(store.showBranding) + stickyBar(v, id) + '</div>';
  }

  function renderService(store) {
    var v = store.vendor, id = v.VendorID, prods = store.products;
    var svcHtml = prods.map(function(p, i) {
      var icons = ['✂️','💆','🏥','🔧','📋','⭐'];
      return '<div class="service-card"><div class="service-icon">' + icons[i % icons.length] + '</div>' +
        '<h3 style="font-weight:700;margin-bottom:0.5rem">' + esc(p.Title) + '</h3>' +
        '<p style="color:#666;font-size:0.875rem;margin-bottom:1rem">' + esc(p.Description) + '</p>' +
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<strong style="font-size:1.125rem">' + fmt(p.DiscountPrice || p.Price) + '</strong>' +
        '<button class="store-btn store-btn-primary" style="font-size:0.8125rem" onclick="StoreActions.enquire(\'' + esc(p.Title).replace(/'/g,"\\'") + '\')">Book Now</button></div></div>';
    }).join('');

    return '<div class="store-root tpl-service" style="--store-primary:' + store.themeColors.primary + ';--store-accent:' + store.themeColors.accent + '">' +
      '<div class="hero"><div class="store-container"><div class="hero-inner">' +
      (v.Logo ? '<img class="hero-logo" src="'+v.Logo+'">' : '') +
      '<div><h1 style="font-size:2rem;font-weight:800">' + esc(v.BusinessName) + '</h1>' +
      (v.Verified === true || v.Verified === 'TRUE' ? '<span class="verified">✓ Verified Pro</span> ' : '') +
      '<p style="opacity:0.8;margin:0.5rem 0">' + esc(v.City) + ' · ★ ' + (v.Rating || '4.8') + '</p>' +
      '<p style="opacity:0.7;max-width:500px">' + esc(v.Description) + '</p>' +
      '<div style="margin-top:1rem;display:flex;gap:0.5rem">' + contactBtns(v, id) + '</div></div></div></div></div>' +
      '<div class="store-section"><div class="store-container"><h2 style="margin-bottom:1.5rem">Our Services</h2><div class="service-grid">' + (svcHtml || '<p>No services listed</p>') + '</div></div></div>' +
      '<div class="store-section" style="background:#f0f0f0"><div class="store-container"><h2 style="margin-bottom:1.5rem">Why Choose Us</h2><div class="team-grid">' +
      '<div class="team-card"><strong>Vetted</strong><p style="font-size:0.8125rem;color:#666;margin-top:0.25rem">Verified professionals</p></div>' +
      '<div class="team-card"><strong>' + (v.YearsInBusiness || '5') + '+ Years</strong><p style="font-size:0.8125rem;color:#666;margin-top:0.25rem">Industry experience</p></div>' +
      '<div class="team-card"><strong>24/7</strong><p style="font-size:0.8125rem;color:#666;margin-top:0.25rem">WhatsApp support</p></div></div></div></div>' +
      enquiryForm(id) + branding(store.showBranding) + stickyBar(v, id) + '</div>';
  }

  function renderTravel(store) {
    var v = store.vendor, id = v.VendorID, prods = store.products;
    var destHtml = prods.map(function(p) {
      var im = imgs(p)[0] || v.CoverBanner || '';
      return '<div class="dest-card" onclick="StoreActions.enquire(\'' + esc(p.Title).replace(/'/g,"\\'") + '\')">' +
        (im ? '<img src="'+im+'">' : '<div style="background:#ddd;height:100%"></div>') +
        '<div class="dest-info"><h3 style="font-weight:700">' + esc(p.Title) + '</h3>' +
        '<p style="font-size:0.8125rem;opacity:0.8">' + esc(p.Description) + '</p>' +
        '<strong>' + fmt(p.DiscountPrice || p.Price) + '</strong></div></div>';
    }).join('');
    var gal = gallery(v);
    var galHtml = gal.length ? '<div class="store-section"><div class="store-container"><h2 style="margin-bottom:1rem">Gallery</h2><div class="gallery-row">' + gal.slice(0,8).map(function(u){return '<img src="'+u+'">';}).join('') + '</div></div></div>' : '';

    return '<div class="store-root tpl-travel" style="--store-primary:' + store.themeColors.primary + '">' +
      '<div class="hero">' + (v.CoverBanner ? '<img src="'+v.CoverBanner+'">' : '<div style="background:#1a365d;height:100%"></div>') +
      '<div class="hero-overlay"><div><h1>' + esc(v.BusinessName) + '</h1>' +
      '<p style="opacity:0.8;margin-top:0.5rem">' + esc(v.City) + (v.State ? ', ' + esc(v.State) : '') + '</p></div></div></div>' +
      '<div class="store-section"><div class="store-container" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:2rem">' +
      '<div>' + (v.Verified === true || v.Verified === 'TRUE' ? '<span class="verified">✓ Verified Host</span> ' : '') +
      '<span>★ ' + (v.Rating || '4.9') + '</span></div><div style="display:flex;gap:0.5rem">' + contactBtns(v, id) + '</div></div>' +
      '<h2 style="margin-bottom:1.5rem">Packages & Destinations</h2><div class="dest-grid">' + (destHtml || '<p>No packages yet</p>') + '</div></div></div>' +
      '<div class="store-section" style="background:#f7f7f7"><div class="store-container"><h2>About</h2><p style="line-height:1.8;color:#444;max-width:700px">' + esc(v.Description) + '</p></div></div>' +
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
    window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent('Hi, I found your store on InstaHelp!'), '_blank');
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
    btn.disabled = true; btn.textContent = 'Sending...';
    var src = InstaHelp.getQueryParam('utm_source') || document.referrer || 'direct';
    google.script.run
      .withSuccessHandler(function(res) {
        btn.disabled = false;
        if (res.success) { btn.textContent = 'Sent ✓'; form.reset(); InstaHelp.toast('Enquiry submitted!', 'success'); }
        else { btn.textContent = 'Submit Enquiry'; InstaHelp.toast(res.error || 'Failed', 'error'); }
      })
      .withFailureHandler(function(err) { btn.disabled = false; btn.textContent = 'Submit Enquiry'; InstaHelp.toast(err.message, 'error'); })
      .saveLead({ vendorId: vendorId, customerName: form.name.value, phone: form.phone.value, requirement: form.requirement.value, source: 'store', trafficSource: src });
  }
};
