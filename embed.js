/*!
 * ActivateMe Fest partners strip
 * To add or change a partner, edit partners.json — not this file.
 *
 * Use on any page:  <script src="https://<host>/embed.js" async></script>
 * Optional attributes on that tag:
 *   data-layout="a" | "b"   one row (a) or two rows (b); default from partners.json
 *   data-h="180"            strip height in px (120–260), default 180
 */
(function () {
  'use strict';

  var script = document.currentScript;
  if (!script || !script.parentNode) return;

  var base = new URL('.', script.src).href;
  var opts = readOptions(script);

  // Reserve the space straight away so the page doesn't jump when logos arrive.
  var host = document.createElement('div');
  host.className = 'amf-partners';
  host.style.cssText = 'display:block;width:100%;height:' + opts.h + 'px;background:#fff;';
  script.parentNode.insertBefore(host, script);
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  whenNearViewport(host, function () {
    fetch(base + 'partners.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(render)
      .catch(function () { host.remove(); }); // never leave a broken box on the site
  });

  function readOptions(s) {
    var q = s.hasAttribute('data-from-url') ? new URLSearchParams(location.search) : null;
    var get = function (k) { return (q && q.get(k)) || s.getAttribute('data-' + k); };
    var h = parseInt(get('h'), 10);
    // On our own page (the iframe) fill whatever height the iframe was given.
    if (!h && q) h = window.innerHeight;
    if (!h) h = 180;
    return {
      layout: (get('layout') || '').toLowerCase(),
      h: Math.max(120, Math.min(260, h)),
      fill: !!q && !q.get('h')
    };
  }

  function whenNearViewport(el, fn) {
    if (!('IntersectionObserver' in window)) return fn();
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); fn(); }
    }, { rootMargin: '400px 0px' });
    io.observe(el);
  }

  function sizes(layout, h) {
    var pad = Math.round(h * 0.09), label = 18, phone = window.innerWidth < 640;
    var logo = layout === 'a'
      ? Math.min(phone ? 48 : 64, h - 2 * pad - label)
      : Math.min(phone ? 44 : 56, Math.floor((h - 2 * pad - 10) / 2) - label);
    return { pad: pad, logo: Math.max(24, logo) };
  }

  function render(data) {
    var layout = opts.layout === 'a' || opts.layout === 'b' ? opts.layout : (data.layout || 'b');
    var s = sizes(layout, opts.h);

    root.innerHTML = '<style>' + CSS + '</style>';
    var strip = el('section', 'strip layout-' + layout);
    strip.setAttribute('aria-label', 'ActivateMe Fest partners');
    strip.style.setProperty('--h', opts.h + 'px');
    strip.style.setProperty('--pad', s.pad + 'px');
    strip.style.setProperty('--logo', s.logo + 'px');
    root.appendChild(strip);

    // Layout A: everyone in one row. Layout B: groups go to the row they ask for.
    var rows = [];
    data.groups.forEach(function (g) {
      var i = layout === 'a' ? 0 : Math.max(0, (g.row || 1) - 1);
      (rows[i] = rows[i] || []).push(g);
    });
    rows = rows.filter(Boolean);

    var pending = rows.map(function (groups, i) {
      return buildRow(strip, groups, i === rows.length - 1 && data.moreToCome, i % 2 === 1);
    });
    Promise.all(pending).then(function () { strip.classList.add('ready'); });

    if (opts.fill) {
      addEventListener('resize', function () {
        var h = Math.max(120, Math.min(260, innerHeight)), z = sizes(layout, h);
        host.style.height = h + 'px';
        strip.style.setProperty('--h', h + 'px');
        strip.style.setProperty('--pad', z.pad + 'px');
        strip.style.setProperty('--logo', z.logo + 'px');
      });
    }
  }

  function buildRow(strip, groups, more, reverse) {
    var row = el('div', 'row' + (reverse ? ' reverse' : ''));
    var track = el('div', 'track');
    var set = el('div', 'rep');
    row.appendChild(track);
    strip.appendChild(row);

    var loads = [];
    groups.forEach(function (g) {
      var group = el('div', 'group');
      if (g.label) {
        var lab = el('span', 'label');
        lab.textContent = g.label;
        group.appendChild(lab);
      }
      var logos = el('div', 'logos');
      (g.logos || []).forEach(function (p) {
        var src = base + 'logos/' + (/\./.test(p.file) ? p.file : p.file + '.webp');
        var img = document.createElement('img');
        img.alt = p.name;
        img.title = p.name;
        img.decoding = 'async';
        img.src = src;
        var item = img;
        if (p.url) {
          item = el('a', 'link');
          item.href = p.url;
          item.target = '_blank';
          item.rel = 'noopener';
          item.appendChild(img);
        }
        item.classList.add('logo');
        logos.appendChild(item);
        loads.push(img.decode().then(function () { fit(img); }, function () { item.remove(); }));
      });
      group.appendChild(logos);
      set.appendChild(group);
    });
    if (more) {
      var m = el('span', 'more');
      m.textContent = more;
      set.appendChild(m);
    }

    return Promise.all(loads).then(function () {
      // Drop groups whose logos all failed to load.
      [].forEach.call(set.querySelectorAll('.logos:empty'), function (l) { l.parentNode.remove(); });
      if (reduced) {
        track.appendChild(set);
        return;
      }
      var lastKey = '';
      var layoutTrack = function () {
        if (!set.parentNode) track.appendChild(set);
        var setW = set.getBoundingClientRect().width;
        var viewW = row.clientWidth;
        if (!setW || !viewW) return;
        var k = Math.max(1, Math.ceil(viewW / setW));
        var key = k + ':' + Math.round(setW);
        if (key === lastKey) return;
        lastKey = key;
        // Track = [k copies][k copies]; sliding by -50% loops seamlessly.
        track.textContent = '';
        for (var i = 0; i < 2 * k; i++) {
          var rep = i === 0 ? set : set.cloneNode(true);
          if (i > 0) hide(rep);
          track.appendChild(rep);
        }
        var px = window.innerWidth < 640 ? 22 : 30; // scroll speed, px per second
        track.style.animationDuration = (k * setW / px).toFixed(1) + 's';
      };
      layoutTrack();
      if ('ResizeObserver' in window) {
        var raf;
        new ResizeObserver(function () {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(layoutTrack);
        }).observe(row);
      }
    });
  }

  // Balance logos optically: square marks use the full height, very wide
  // wordmarks are shrunk a little so they don't dominate.
  function fit(img) {
    var r = img.naturalWidth / img.naturalHeight || 1;
    var f = Math.min(1, Math.pow(2 / r, 0.4));
    if (r * f > 3.2) f = 3.2 / r;
    img.style.height = 'calc(var(--logo) * ' + f.toFixed(3) + ')';
    img.style.width = 'calc(var(--logo) * ' + (f * r).toFixed(3) + ')';
  }

  function hide(rep) {
    rep.setAttribute('aria-hidden', 'true');
    [].forEach.call(rep.querySelectorAll('img'), function (i) { i.alt = ''; });
    [].forEach.call(rep.querySelectorAll('a'), function (a) { a.tabIndex = -1; });
  }

  function el(tag, cls) {
    var e = document.createElement(tag);
    e.className = cls;
    return e;
  }

  var CSS = [
    ':host{display:block;width:100%;contain:layout paint}',
    '.strip{--orange:#F26B1D;--purple:#5B21C4;--grey:#8A8A8A;--fade:56px;',
    '  box-sizing:border-box;height:var(--h);padding:var(--pad) 0;background:#fff;',
    '  display:flex;flex-direction:column;justify-content:center;gap:10px;overflow:hidden;',
    '  font-family:inherit;-webkit-font-smoothing:antialiased;opacity:0;transition:opacity .4s}',
    '.strip.ready{opacity:1}',
    '.row{overflow:hidden;',
    '  -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 var(--fade),#000 calc(100% - var(--fade)),transparent 100%);',
    '  mask-image:linear-gradient(90deg,transparent 0,#000 var(--fade),#000 calc(100% - var(--fade)),transparent 100%)}',
    '.track{display:flex;width:max-content;animation:amf-scroll 60s linear infinite}',
    '.reverse .track{animation-direction:reverse}',
    '.row:hover .track,.row:focus-within .track{animation-play-state:paused}',
    '@keyframes amf-scroll{to{transform:translateX(-50%)}}',
    '.rep{display:flex;align-items:flex-end;flex:none;padding-left:var(--fade)}',
    '.group{display:flex;flex-direction:column;align-items:flex-start;padding-right:28px}',
    '.label{display:flex;align-items:center;gap:6px;height:12px;margin-bottom:6px;white-space:nowrap;',
    '  font-family:inherit;font-size:10.5px;font-weight:600;line-height:1;letter-spacing:.12em;text-transform:uppercase;color:var(--grey)}',
    '.label::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--orange);flex:none}',
    '.logos{display:flex;align-items:center;height:var(--logo)}',
    '.logo{display:block;flex:none;margin-right:40px}',
    'img.logo,.logo img{display:block;max-width:none;mix-blend-mode:multiply;border:0}',
    'a.logo{outline-offset:4px}',
    '.more{flex:none;align-self:flex-end;display:flex;align-items:center;height:var(--logo);',
    '  margin-right:68px;white-space:nowrap;font-family:inherit;font-size:15px;font-weight:600;',
    '  font-style:italic;color:var(--purple);opacity:.8}',
    '@media (max-width:639px){.strip{--fade:24px}.logo{margin-right:28px}.group{padding-right:16px}.more{margin-right:44px}}',
    '@media (prefers-reduced-motion:reduce){',
    '  .track{animation:none}',
    '  .row{overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}',
    '  .row::-webkit-scrollbar{display:none}',
    '  .rep{padding:0 var(--fade)}}'
  ].join('\n');
})();
