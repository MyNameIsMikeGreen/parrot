/**
 * Backs the VPN access toggle on the landing page: switches "private
 * network only" links from the default hostname (`pi`) to the one that
 * resolves over the VPN instead.
 *
 * Served as its own file, rather than inlined by Astro, so the site's
 * Content Security Policy only needs `script-src 'self'` and never
 * `'unsafe-inline'`. See `src/components/VpnAccessToggle.astro` and
 * `docs/security.md`.
 */
(function () {
  var STORAGE_KEY = 'vpnAccess';

  var toggle = document.getElementById('vpn-toggle-input');
  if (!(toggle instanceof HTMLInputElement)) {
    return;
  }

  var alternateHostname = toggle.dataset.alternateHostname;

  function isEnabled() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      // Storage can throw in private-browsing modes; treat it as off.
      return false;
    }
  }

  function setEnabled(value) {
    try {
      if (value) {
        window.localStorage.setItem(STORAGE_KEY, 'true');
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Nothing to persist to; the switch still reflects the current value.
    }
  }

  toggle.checked = isEnabled();

  toggle.addEventListener('change', function () {
    setEnabled(toggle.checked);
  });

  // Rewrites a private link's target at the moment it is clicked, so the
  // visible `href` in the page's markup never changes and every other
  // visitor sees exactly what they always did. The link's original address
  // is captured once, before anything can rewrite it — as the exact
  // attribute string, not the parsed `.href` property, so restoring it later
  // is byte-for-byte the same rather than merely equivalent. Switching the
  // toggle off after a link has already been rewritten must restore it, not
  // just leave it alone.
  var privateLinks = document.querySelectorAll('a.link-card--private');
  for (var i = 0; i < privateLinks.length; i++) {
    var link = privateLinks[i];
    if (!(link instanceof HTMLAnchorElement)) {
      continue;
    }

    link.dataset.defaultHref = link.getAttribute('href');

    link.addEventListener('click', function (event) {
      var target = event.currentTarget;
      if (!(target instanceof HTMLAnchorElement) || !alternateHostname) {
        return;
      }

      if (!toggle.checked) {
        target.setAttribute('href', target.dataset.defaultHref);
        return;
      }

      var url = new URL(target.dataset.defaultHref);
      url.hostname = alternateHostname;
      target.setAttribute('href', url.toString());
    });
  }
})();
