/* IRV'OHM — bandeau de consentement cookies (Google Consent Mode v2) */
(function () {
  'use strict';

  var STORAGE_KEY = 'irvohm_cookie_consent';

  function gtagUpdate(granted) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
  }

  function getStoredChoice() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function storeChoice(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      /* stockage indisponible (navigation privée...) : le bandeau réapparaîtra, sans casser le site */
    }
  }

  function injectStyles() {
    if (document.getElementById('irvohm-consent-style')) return;
    var style = document.createElement('style');
    style.id = 'irvohm-consent-style';
    style.textContent =
      '#irvohm-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:9998;' +
      'background:#fffdf9;border:1px solid rgba(187,203,187,0.4);border-radius:18px;' +
      'box-shadow:0 20px 50px rgba(7,34,26,0.18);padding:20px 22px;' +
      'max-width:560px;margin-inline:auto;font-family:"Inter",system-ui,sans-serif;' +
      'opacity:0;transform:translateY(16px);transition:opacity .35s ease,transform .35s ease}' +
      '#irvohm-consent.irvohm-in{opacity:1;transform:none}' +
      '#irvohm-consent p{margin:0 0 14px;font-size:13.5px;line-height:1.6;color:#4a463b}' +
      '#irvohm-consent a{color:#006d37;font-weight:600;text-decoration:underline}' +
      '#irvohm-consent-actions{display:flex;flex-wrap:wrap;gap:10px}' +
      '#irvohm-consent button{font-family:inherit;font-size:13.5px;font-weight:600;border-radius:10px;' +
      'padding:11px 20px;cursor:pointer;border:none;transition:transform .15s ease,opacity .2s ease}' +
      '#irvohm-consent button:hover{transform:translateY(-1px)}' +
      '#irvohm-accept-cookies{background:linear-gradient(120deg,#006d37,#006397);color:#fff;flex:1}' +
      '#irvohm-refuse-cookies{background:#f2ebdf;color:#1b1a16;flex:1}' +
      '#irvohm-consent-reopen{position:fixed;left:16px;bottom:16px;z-index:9997;width:44px;height:44px;' +
      'border-radius:50%;background:#fffdf9;border:1px solid rgba(187,203,187,0.5);' +
      'box-shadow:0 10px 26px rgba(7,34,26,0.14);cursor:pointer;font-size:20px;' +
      'display:none;align-items:center;justify-content:center;padding:0}' +
      '@media (max-width:480px){#irvohm-consent{left:10px;right:10px;bottom:10px;padding:18px}}';
    document.head.appendChild(style);
  }

  function buildBanner() {
    var el = document.createElement('div');
    el.id = 'irvohm-consent';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Consentement aux cookies');
    el.innerHTML =
      '<p>Ce site utilise des cookies de mesure d\'audience (Google Analytics) pour comprendre comment il est utilisé. ' +
      'Aucun cookie publicitaire. Vous pouvez accepter ou refuser librement — voir notre ' +
      '<a href="/politique-confidentialite.html">politique de confidentialité</a>.</p>' +
      '<div id="irvohm-consent-actions">' +
      '<button type="button" id="irvohm-refuse-cookies">Refuser</button>' +
      '<button type="button" id="irvohm-accept-cookies">Accepter</button>' +
      '</div>';
    return el;
  }

  function buildReopenButton() {
    var btn = document.createElement('button');
    btn.id = 'irvohm-consent-reopen';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Gérer mes préférences de cookies');
    btn.title = 'Gérer mes préférences de cookies';
    btn.textContent = '🍪';
    return btn;
  }

  function init() {
    injectStyles();
    var reopenBtn = buildReopenButton();
    document.body.appendChild(reopenBtn);

    var banner = null;

    function showBanner() {
      if (banner) return;
      banner = buildBanner();
      document.body.appendChild(banner);
      requestAnimationFrame(function () { banner.classList.add('irvohm-in'); });
      reopenBtn.style.display = 'none';

      document.getElementById('irvohm-accept-cookies').addEventListener('click', function () {
        storeChoice('granted');
        gtagUpdate(true);
        hideBanner();
      });
      document.getElementById('irvohm-refuse-cookies').addEventListener('click', function () {
        storeChoice('denied');
        gtagUpdate(false);
        hideBanner();
      });
    }

    function hideBanner() {
      if (!banner) return;
      banner.classList.remove('irvohm-in');
      setTimeout(function () {
        if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
        banner = null;
      }, 350);
      reopenBtn.style.display = 'flex';
    }

    reopenBtn.addEventListener('click', function () {
      if (banner) { hideBanner(); } else { showBanner(); }
    });

    var stored = getStoredChoice();
    if (stored === 'granted') {
      gtagUpdate(true);
      reopenBtn.style.display = 'flex';
    } else if (stored === 'denied') {
      reopenBtn.style.display = 'flex';
    } else {
      showBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
