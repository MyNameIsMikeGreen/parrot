/**
 * Lets a visitor substitute their own hostname or IP address for the "pi"
 * host used by private-network-only links on the landing page.
 *
 * Served as its own file, rather than inlined by Astro, so the site's
 * Content Security Policy only needs `script-src 'self'` and never
 * `'unsafe-inline'`. See `src/components/PrivateHostnameOverride.astro` and
 * `docs/security.md`.
 */
(function () {
  var STORAGE_KEY = 'privateHostnameOverride';

  var input = document.getElementById('hostname-override-input');
  var clearButton = document.getElementById('hostname-override-clear');
  var status = document.getElementById('hostname-override-status');

  function announce(message) {
    if (status) {
      status.textContent = message;
    }
  }

  function getOverride() {
    try {
      var value = window.localStorage.getItem(STORAGE_KEY);
      return value ? value.trim() : '';
    } catch {
      // Storage can throw in private-browsing modes; treat it as unset.
      return '';
    }
  }

  function setOverride(value) {
    try {
      if (value) {
        window.localStorage.setItem(STORAGE_KEY, value);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Nothing to persist to; the input still reflects the current value.
    }
  }

  if (input) {
    var existing = getOverride();
    if (existing) {
      input.value = existing;
      announce('Private links will use "' + existing + '".');
    }

    input.addEventListener('input', function () {
      var value = input.value.trim();
      setOverride(value);
      announce(value ? 'Private links will use "' + value + '".' : '');
    });
  }

  if (clearButton) {
    clearButton.addEventListener('click', function () {
      setOverride('');
      if (input) {
        input.value = '';
      }
      announce('Cleared. Private links will use their default host again.');
    });
  }

  // Rewrites a private link's target at the moment it is clicked, so the
  // visible `href` in the page's markup never changes and every other
  // visitor sees exactly what they always did.
  var privateLinks = document.querySelectorAll('a.link-card--private');
  for (var i = 0; i < privateLinks.length; i++) {
    privateLinks[i].addEventListener('click', function (event) {
      var override = getOverride();
      var link = event.currentTarget;
      if (!override || !(link instanceof HTMLAnchorElement)) {
        return;
      }

      var url = new URL(link.href);
      url.hostname = override;
      link.href = url.toString();
    });
  }
})();
