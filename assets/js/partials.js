/* assets/js/partials.js */
(function (w, d) {
  'use strict';

  // --- tiny helpers ---
  function $(sel, root) { return (root || d).querySelector(sel); }
  function fetchText(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
      return r.text();
    });
  }

  // Make a root-absolute path (e.g. "/assets/partials/x.html") work from nested pages
  function relativeFromRoot(absPath) {
    var clean = absPath.replace(/^\//, ''); // "assets/partials/x.html"
    var parts = d.location.pathname.replace(/^\//, '').split('/'); // ["board-of-governors.html"] or ["About","about.html"]
    if (parts.length && /\./.test(parts[parts.length - 1])) parts.pop(); // remove filename
    var depth = Math.max(0, parts.length); // how many folders deep
    var prefix = depth ? '../'.repeat(depth) : './';
    return prefix + clean;
  }

  // Try a list of URLs; inject first that works
  function tryUrls(targetSelector, urls, done) {
    var i = 0;
    function attempt() {
      if (i >= urls.length) {
        console.error('Partial load failed. Tried:', urls);
        return;
      }
      var url = urls[i++];
      fetchText(url)
        .then(function (html) {
          var host = $(targetSelector);
          if (!host) { console.error('Target not found:', targetSelector); return; }
          host.innerHTML = html;
          if (typeof done === 'function') done();
        })
        .catch(function () { attempt(); }); // try next
    }
    attempt();
  }

  // --- public helpers ---
  function loadPartial(targetSelector, url, done) {
    tryUrls(targetSelector, [url], done);
  }

  function loadNavbar(targetSelector) {
    var abs = '/assets/partials/navbar.html';
    tryUrls(targetSelector, [abs, relativeFromRoot(abs), 'assets/partials/navbar.html'], function () {
      // enable hover dropdowns if the plugin is present
      if (w.jQuery && w.jQuery.fn && w.jQuery.fn.dropdownHover) {
        w.jQuery('[data-hover="dropdown"]').dropdownHover();
      }
      markActiveTop();
    });
  }

  function loadAboutNav(targetSelector) {
    // IMPORTANT: this matches your actual filename "leftnav.html"
    var abs = '/assets/partials/leftnav.html';
    tryUrls(targetSelector, [abs, relativeFromRoot(abs), 'assets/partials/leftnav.html'], function () {
      markActiveAbout(targetSelector);
    });
  }

  function markActiveTop() {
    var p = d.location.pathname.toLowerCase();
    var key = null;
    if (p.includes('about') || p.includes('board-of-governors')) key = 'about';
    else if (p.includes('program')) key = 'programs';
    else if (p.includes('tournament')) key = 'tournaments';
    else if (p.includes('schedule')) key = 'schedule';
    if (key) {
      var li = d.querySelector('.navbar-bmhc [data-top="' + key + '"]');
      if (li) li.classList.add('active');
    }
  }

  function markActiveAbout(containerSelector, key) {
    var host = $(containerSelector);
    var activeKey = key || (host ? host.getAttribute('data-active') : '');
    if (!activeKey) return;
    var li = d.querySelector(containerSelector + ' [data-key="' + activeKey + '"]');
    if (li) li.classList.add('active');
  }

  // expose
  w.loadPartial     = loadPartial;
  w.loadNavbar      = loadNavbar;
  w.loadAboutNav    = loadAboutNav;
  w.markActiveTop   = markActiveTop;
  w.markActiveAbout = markActiveAbout;

})(window, document);