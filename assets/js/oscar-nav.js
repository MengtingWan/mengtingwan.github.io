/**
 * oscar-nav.js — Universal category navigation + broken image handler.
 *
 * Auto-detects categories from page structure:
 *   - Legacy pages (2017-2023): <section id="..."> <h3>...</h3>
 *   - 2026 page: <details data-cat="...">
 *
 * Creates a sticky horizontal scrollable category bar below the header.
 * Highlights current category on scroll via IntersectionObserver.
 */
(function () {
  'use strict';

  var SHORT = {
    'best picture':'Picture','best motion picture':'Picture',
    'best motion picture of the year':'Picture',
    'best actor':'Actor','best actor leading':'Actor','best actor leading role':'Actor',
    'best performance by an actor in a leading role':'Actor',
    'best actress':'Actress','best actress leading':'Actress','best actress leading role':'Actress',
    'best performance by an actress in a leading role':'Actress',
    'best supporting actor':'Supp. Actor','best actor supporting':'Supp. Actor','best actor supporting role':'Supp. Actor',
    'best performance by an actor in a supporting role':'Supp. Actor',
    'best supporting actress':'Supp. Actress','best actress supporting':'Supp. Actress','best actress supporting role':'Supp. Actress',
    'best performance by an actress in a supporting role':'Supp. Actress',
    'best director':'Director','best directing':'Director',
    'best achievement in directing':'Director',
    'best original screenplay':'Orig. Script','best writing original screenplay':'Orig. Script',
    'best adapted screenplay':'Adapt. Script','best writing adapted screenplay':'Adapt. Script',
    'best cinematography':'Cinematography','best achievement in cinematography':'Cinematography',
    'best film editing':'Editing','best achievement in film editing':'Editing',
    'best production design':'Prod. Design','best achievement in production design':'Prod. Design',
    'best costume design':'Costume','best achievement in costume design':'Costume',
    'best sound':'Sound','best sound editing':'Sound','best sound mixing':'Sound',
    'best makeup':'Makeup','best makeup and hairstyling':'Makeup',
    'best achievement in makeup and hairstyling':'Makeup',
    'best music score':'Score','best music written for motion pictures original score':'Score',
    'best music written for pictures original score':'Score',
    'best achievement in music written for motion pictures (original score)':'Score',
    'best music song':'Song','best music written for motion pictures original song':'Song',
    'best music written for pictures original song':'Song',
    'best achievement in music written for motion pictures (original song)':'Song',
    'best visual effects':'VFX','best achievement in visual effects':'VFX',
    'best animated feature':'Animated','best animated feature film':'Animated',
    'best documentary feature':'Documentary','best documentary':'Documentary',
    'best international feature film':'International','best international feature':'International',
    'best foreign language film':'International',
    'best animated short film':'Anim. Short','best live action short film':'Live Short',
    'best documentary short film':'Doc. Short','best documentary short subject':'Doc. Short',
    'best casting':'Casting',
  };
  var SHORT_CN = {
    'Picture':'影片','Actor':'男主','Actress':'女主',
    'Supp. Actor':'男配','Supp. Actress':'女配','Director':'导演',
    'Orig. Script':'原创剧本','Adapt. Script':'改编剧本',
    'Cinematography':'摄影','Editing':'剪辑','Prod. Design':'美术',
    'Costume':'服装','Sound':'音效','Makeup':'化妆','Score':'配乐',
    'Song':'歌曲','VFX':'视效','Animated':'动画','Documentary':'纪录片',
    'International':'国际','Anim. Short':'动画短片','Live Short':'真人短片',
    'Doc. Short':'纪录短片','Casting':'选角',
  };
  var isCN = document.documentElement.lang === 'zh' || location.pathname.indexOf('_cn') !== -1;

  function getShort(raw) {
    var key = raw.toLowerCase().replace(/[:\s]+$/g, '').trim();
    var en = SHORT[key] || raw.replace(/^best\s+/i, '').replace(/\s*:.*/, '');
    if (en.length > 18) en = en.substring(0, 16) + '..';
    return isCN ? (SHORT_CN[en] || en) : en;
  }

  function detectCategories() {
    var cats = [];
    // Legacy pages: <section id="..."> with <h3>
    document.querySelectorAll('section[id]').forEach(function (sec) {
      var h3 = sec.querySelector('h3');
      if (!h3) return;
      cats.push({ el: sec, id: sec.id, label: getShort(h3.textContent.trim()) });
    });
    if (cats.length > 0) return cats;
    // 2026 page: <details data-cat="...">
    document.querySelectorAll('details[data-cat]').forEach(function (det) {
      var raw = det.getAttribute('data-cat');
      if (!raw) return;
      if (!det.id) det.id = 'cat-' + raw.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      cats.push({ el: det, id: det.id, label: getShort(raw) });
    });
    return cats;
  }

  var currentObserver = null;

  function buildNav(cats) {
    // Remove existing nav
    var old = document.getElementById('oscar-cats');
    if (old) old.remove();
    if (currentObserver) { currentObserver.disconnect(); currentObserver = null; }
    if (cats.length < 3) return null;

    var nav = document.createElement('nav');
    nav.className = 'oscar-cats';
    nav.id = 'oscar-cats';

    cats.forEach(function (cat) {
      var a = document.createElement('a');
      a.href = '#' + cat.id;
      a.className = 'oscar-cat-link';
      a.textContent = cat.label;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        cat.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (cat.el.tagName === 'DETAILS' && !cat.el.open) cat.el.open = true;
      });
      nav.appendChild(a);
    });

    var header = document.querySelector('.oscar-header');
    if (header) {
      header.parentNode.insertBefore(nav, header.nextSibling);
    } else {
      document.body.insertBefore(nav, document.body.firstChild.nextSibling);
    }

    // Scroll highlight
    if ('IntersectionObserver' in window) {
      var links = nav.querySelectorAll('.oscar-cat-link');
      currentObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var idx = cats.findIndex(function (c) { return c.el === entry.target; });
            if (idx === -1) return;
            links.forEach(function (l, i) { l.classList.toggle('active', i === idx); });
            if (links[idx]) links[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        });
      }, { rootMargin: '-80px 0px -60% 0px', threshold: 0 });
      cats.forEach(function (cat) { currentObserver.observe(cat.el); });
    }
    return nav;
  }

  // Broken image handler
  function addPlaceholder(img) {
    var parent = img.parentElement;
    if (parent && !parent.querySelector('.img-placeholder')) {
      var ph = document.createElement('div');
      ph.className = 'img-placeholder';
      ph.style.cssText = 'width:100%;aspect-ratio:2/3;background:#f0eeea;display:flex;align-items:center;justify-content:center;color:#ccc;font-size:2em;border-radius:4px;';
      ph.textContent = '\uD83C\uDFAC';
      parent.insertBefore(ph, img);
    }
  }

  function fixBrokenImages() {
    document.querySelectorAll('img').forEach(function (img) {
      var src = img.getAttribute('src');
      if (!src || src === 'nan' || src === '' || src === location.href) {
        img.style.display = 'none';
        addPlaceholder(img);
        return;
      }
      img.addEventListener('error', function () {
        this.style.display = 'none';
        addPlaceholder(this);
      });
    });
  }

  // Click-toggle dropdown (for mobile)
  function fixDropdown() {
    document.querySelectorAll('.oscar-dropdown').forEach(function (dd) {
      var btn = dd.querySelector('.oscar-dropdown-btn');
      var menu = dd.querySelector('.oscar-dropdown-menu');
      if (!btn || !menu) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
      });
      document.addEventListener('click', function () { menu.style.display = 'none'; });
      menu.addEventListener('click', function (e) { e.stopPropagation(); });
    });
  }

  function init() {
    fixBrokenImages();
    fixDropdown();
    var cats = detectCategories();
    buildNav(cats);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 50); });
  } else {
    setTimeout(init, 200);
  }

  // Exposed for 2026 page to call after rebuilding content
  window.refreshOscarNav = function () {
    var cats = detectCategories();
    buildNav(cats);
  };
})();
