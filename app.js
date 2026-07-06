/* ======================================================================
   太吾绘卷·百晓册 —— 前端逻辑
   零依赖：markdown 渲染 / 模糊搜索 / 树形导航 / hash 路由 / 懒加载 / 夜间模式
   ====================================================================== */
(function () {
  'use strict';

  // 安卓原生客户端内隐藏“下载安卓端”按钮（仅网站显示）
  if (window.capacitor || (navigator.userAgent.indexOf('Android') > -1 && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || document.cookie.indexOf('in-app') > -1) {
    document.documentElement.className += ' in-app';
  }

  var INDEX = window.__WIKI_INDEX || [];   // [{k,t,c,p,s:[..],x}]
  var CATS  = window.__WIKI_CATS || [];
  var CATFILES = window.__WIKI_CATFILES || {};
  var CHUNKS = window.__WIKI_CHUNK || (window.__WIKI_CHUNK = {});

  // 按 key 建立快速查找
  var byKey = Object.create(null);
  var byEntryName = Object.create(null);
  for (var i = 0; i < INDEX.length; i++) {
    byKey[INDEX[i].k] = INDEX[i];
    addEntryNameAlias(INDEX[i].k, INDEX[i]);
    addEntryNameAlias(INDEX[i].t, INDEX[i]);
  }

  // ---------- DOM 引用 ----------
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var el = function (tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  var topbar = $('.topbar');
  var searchInput = $('#search');
  var searchResults = $('#search-results');
  var sidebar = $('#sidebar');
  var reader = $('#reader');
  var treeEl = $('#tree');
  var scrim = $('#scrim');
  var sideTabs = $('#side-tabs');
  var menuToggle = $('#menu-toggle');
  var fontToggle = $('#font-toggle');
  var themeToggle = $('#theme-toggle');
  var backToTop = $('#back-to-top');

  // ---------- 主题 ----------
  function initTheme() {
    var saved = localStorage.getItem('tw-theme');
    var theme = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(theme);
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('tw-theme', t);
    if (themeToggle) themeToggle.innerHTML = t === 'dark' ? ICON.sun : ICON.moon;
  }
  themeToggle && themeToggle.addEventListener('click', function () {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  // ---------- 瀛椾綋 ----------
  function initFontMode() {
    var saved = localStorage.getItem('tw-font-mode');
    applyFontMode(saved === 'sans' ? 'sans' : 'classic');
  }
  function applyFontMode(mode) {
    if (mode === 'sans') document.documentElement.setAttribute('data-font', 'sans');
    else document.documentElement.removeAttribute('data-font');
    localStorage.setItem('tw-font-mode', mode);
    if (fontToggle) {
      fontToggle.innerHTML = mode === 'sans' ? ICON.fontClassic : ICON.fontSans;
      fontToggle.classList.toggle('active', mode === 'sans');
      fontToggle.setAttribute('title', mode === 'sans' ? '切回默认字体' : '切换为非衬线字体');
      fontToggle.setAttribute('aria-label', mode === 'sans' ? '切回默认字体' : '切换为非衬线字体');
    }
  }
  fontToggle && fontToggle.addEventListener('click', function () {
    applyFontMode(document.documentElement.getAttribute('data-font') === 'sans' ? 'classic' : 'sans');
  });

  // ---------- 图标 ----------
  var ICON = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 a7 7 0 0 0 9.8 9.8z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    top: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    fontSans: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19L10 5h4l6 14"/><path d="M7 14h10"/></svg>',
    fontClassic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5h14"/><path d="M12 5v14"/><path d="M8 11h8"/><path d="M6 19h12"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18.9 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  $('.search-icon') && ($('.search-icon').innerHTML = ICON.search);
  menuToggle && (menuToggle.innerHTML = ICON.menu);
  fontToggle && (fontToggle.innerHTML = ICON.fontSans);
  themeToggle && (themeToggle.innerHTML = document.documentElement.getAttribute('data-theme') === 'dark' ? ICON.sun : ICON.moon);
  backToTop && (backToTop.innerHTML = ICON.top);

  // ---------- 分类视图（目录 / 收藏 / 历史） ----------
  var currentView = 'tree';
  var currentEntryKey = null;   // 当前浏览的条目 key（用于切回目录时恢复高亮）
  function renderSideTabs() {
    sideTabs.innerHTML =
      '<button class="side-tab ' + (currentView === 'tree' ? 'active' : '') + '" data-view="tree">目录</button>' +
      '<button class="side-tab ' + (currentView === 'fav' ? 'active' : '') + '" data-view="fav">收藏</button>' +
      '<button class="side-tab ' + (currentView === 'hist' ? 'active' : '') + '" data-view="hist">足迹</button>';
    sideTabs.querySelectorAll('.side-tab').forEach(function (b) {
      b.addEventListener('click', function () { switchView(b.dataset.view); });
    });
  }
  function switchView(v) {
    currentView = v;
    renderSideTabs();
    if (v === 'tree') {
      renderTree();
      // 切回目录时，恢复当前浏览条目的高亮与展开
      if (currentEntryKey) highlightTree(currentEntryKey);
    }
    else if (v === 'fav') renderFavList();
    else if (v === 'hist') renderList(getHist().reverse(), '尚无足迹', '浏览过的条目将记录于此（最近 10 次）');
  }
  // 收藏列表渲染（带移除按钮，移除后自动刷新）
  function renderFavList() {
    renderList(getFavs(), '尚无收藏', '点击正文标题旁的星标可收藏条目', {
      removable: true,
      onRemove: function (k) { toggleFav(k); renderFavList(); }
    });
  }

  // ---------- 树形导航 ----------
  // 把 INDEX 按 path('›'分隔) 组织成嵌套树
  function buildTree() {
    var root = { children: {} };
    for (var i = 0; i < INDEX.length; i++) {
      var e = INDEX[i];
      var parts = e.p ? e.p.split('›') : [];
      var node = root;
      for (var j = 0; j < parts.length; j++) {
        var name = parts[j];
        if (!node.children[name]) node.children[name] = { name: name, children: {}, entry: null };
        node = node.children[name];
        // 叶子层（最后一段）挂上条目；但目录名可能 == 条目名（如 修习/修习方式/周天运转/周天运转）
        if (j === parts.length - 1) {
          // 仅当条目 title 与目录最后一段不同，或路径深度 < 文件实际目录深度时挂载
          // 这里：最深层目录挂载条目（用 entry 标记）
          if (!node.entry) node.entry = e;
        }
      }
      // 若条目无目录层（p 为空），直接挂根
      if (parts.length === 0) {
        if (!root.children[e.t]) root.children[e.t] = { name: e.t, children: {}, entry: null };
        root.children[e.t].entry = e;
      }
    }
    return root;
  }

  function renderTree() {
    var tree = buildTree();
    treeEl.innerHTML = '';
    // 按 CATS 顺序输出顶层，但隐藏「词条」大类
    // （词条含六千余条目，目录无法尽列，仅通过搜索或正文链接查阅）
    var topNodes = [];
    for (var i = 0; i < CATS.length; i++) {
      var c = CATS[i];
      if (c === '词条') continue;
      if (tree.children[c]) topNodes.push(tree.children[c]);
    }
    // 补上未在 CATS 的（不含词条）
    Object.keys(tree.children).forEach(function (k) {
      if (k === '词条') return;
      if (CATS.indexOf(k) === -1) topNodes.push(tree.children[k]);
    });

    topNodes.forEach(function (node) { treeEl.appendChild(renderTreeNode(node, 0, '')); });

    // 底部提示：词条需搜索查阅
    treeEl.appendChild(el('div', 'tree-hint', '「词条」含六千余条目，请于上方搜索框输入名称查阅。'));
  }

  function renderTreeNode(node, level, parentPath) {
    var wrap = el('div', 'tree-node');
    var row = el('div', 'tree-row');
    row.dataset.level = level;
    row.setAttribute('role', 'treeitem');

    // 本节点在面包屑路径中的完整段（用于定位当前浏览的分支）
    var nodePath = parentPath ? parentPath + '›' + node.name : node.name;
    wrap.dataset.path = nodePath;

    var hasChildren = Object.keys(node.children).length > 0;
    var toggle = el('span', 'tree-toggle' + (hasChildren ? '' : 'leaf'), hasChildren ? '▶' : '');
    var label = el('span', 'tree-label', escapeHtml(node.name));
    row.appendChild(toggle);
    row.appendChild(label);

    // 当前节点是否是一个可点击条目（独立于目录）
    var entry = node.entry;
    // 标记可跳转的条目行，便于导航时定位高亮
    if (entry) row.dataset.key = entry.k;
    // 点击行为：点 toggle(▶) 仅展开/折叠；点行其余部分则跳转
    //  · 有子节点的一/二级目录 → 跳转到对应索引页
    //  · 叶子词条 → 跳转到词条正文
    //  · 目录名==条目名（如 门派›门派概述›门派）→ 跳转到词条正文
    if (entry && hasChildren && entry.t === node.name) {
      // 目录名==条目名：点击进词条，点 toggle 展开
      row.addEventListener('click', function (ev) {
        if (ev.target === toggle) { toggleNode(wrap); return; }
        goEntry(entry.k);
      });
    } else if (entry) {
      // 叶子词条
      row.addEventListener('click', function (ev) {
        if (ev.target === toggle && hasChildren) { toggleNode(wrap); return; }
        goEntry(entry.k);
      });
      row.style.cursor = 'pointer';
    } else if (hasChildren) {
      // 纯目录（一/二级）：点击进索引页（renderIndex 会展开当前节点露出下级）；点 toggle 仅展开/折叠
      row.addEventListener('click', function (ev) {
        if (ev.target === toggle) { toggleNode(wrap); return; }
        goIndex(nodePath);
      });
      row.style.cursor = 'pointer';
    }

    wrap.appendChild(row);

    if (hasChildren) {
      var kids = el('div', 'tree-children');
      // 子节点排序：先按是否有更深层，名称排序
      var childArr = Object.keys(node.children).map(function (k) { return node.children[k]; });
      childArr.forEach(function (c) { kids.appendChild(renderTreeNode(c, level + 1, nodePath)); });
      wrap.appendChild(kids);
    }
    return wrap;
  }
  function toggleNode(wrap) { wrap.classList.toggle('open'); }

  // ---------- 收藏 / 历史 ----------
  function getFavs() {
    try { return JSON.parse(localStorage.getItem('tw-favs') || '[]'); } catch (e) { return []; }
  }
  function setFavs(a) { localStorage.setItem('tw-favs', JSON.stringify(a)); }
  function isFav(k) { return getFavs().indexOf(k) >= 0; }
  function toggleFav(k) {
    var a = getFavs(); var i = a.indexOf(k);
    if (i >= 0) a.splice(i, 1); else a.unshift(k);
    setFavs(a);
  }
  function getHist() {
    try { return JSON.parse(localStorage.getItem('tw-hist') || '[]'); } catch (e) { return []; }
  }
  function pushHist(k) {
    var a = getHist(); var i = a.indexOf(k);
    if (i >= 0) a.splice(i, 1);
    a.push(k);
    // 仅保留最近 10 次
    if (a.length > 10) a = a.slice(-10);
    localStorage.setItem('tw-hist', JSON.stringify(a));
  }

  function renderList(keys, emptyTitle, emptyHint, opts) {
    opts = opts || {};
    treeEl.innerHTML = '';
    if (!keys.length) {
      treeEl.appendChild(el('div', 'tree-hint', '<strong style="color:var(--ink-mute)">' + emptyTitle + '</strong><br>' + emptyHint));
      return;
    }
    keys.forEach(function (k) {
      var e = byKey[k]; if (!e) return;
      var row = el('div', 'tree-row');
      row.dataset.level = 1;
      row.innerHTML = '<span class="tree-toggle leaf"></span>' +
        '<span class="tree-label">' + escapeHtml(e.t) + '</span>' +
        (opts.removable ? '<span class="row-remove" data-key="' + escapeHtml(k) + '" title="移除">' + ICON.close + '</span>' : '');
      row.addEventListener('click', function (ev) {
        if (ev.target.closest('.row-remove')) return;
        goEntry(k);
      });
      treeEl.appendChild(row);
    });
    // 移除按钮
    if (opts.removable) {
      treeEl.querySelectorAll('.row-remove').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var rk = btn.getAttribute('data-key');
          if (opts.onRemove) opts.onRemove(rk);
        });
      });
    }
  }

  // ---------- 模糊搜索 ----------
  // 评分：标题完全包含 > 标题子序列 > 正文包含 > 正文子序列
  function search(q) {
    q = (q || '').trim();
    if (!q) return [];
    var ql = q.toLowerCase();
    var results = [];
    for (var i = 0; i < INDEX.length; i++) {
      var e = INDEX[i];
      var title = e.t;
      var tl = title.toLowerCase();
      var text = e.x;
      var score = 0, where = '';
      // 标题精确包含
      var ti = tl.indexOf(ql);
      if (ti >= 0) {
        score = 1000 - ti + (title.length === q.length ? 500 : 0);
        where = 't';
      } else if (isSubseq(ql, tl)) {
        // 标题子序列
        score = 400 + (ql.length / Math.max(tl.length, 1)) * 100;
        where = 't';
      } else {
        // 正文包含
        var xi = text.toLowerCase().indexOf(ql);
        if (xi >= 0) {
          score = 120 - Math.min(xi / 50, 80);
          where = 'x';
        } else if (ql.length >= 2 && isSubseq(ql, text.toLowerCase())) {
          score = 20;
          where = 'x';
        }
      }
      if (score > 0) {
        results.push({ e: e, score: score, where: where, qi: ti >= 0 ? ti : (where === 'x' ? text.toLowerCase().indexOf(ql) : -1) });
      }
    }
    results.sort(function (a, b) { return b.score - a.score; });
    return results.slice(0, 60);
  }
  function isSubseq(needle, hay) {
    var i = 0, j = 0;
    while (i < needle.length && j < hay.length) {
      if (needle.charCodeAt(i) === hay.charCodeAt(j)) i++;
      j++;
    }
    return i === needle.length;
  }

  var searchTimer = null;
  var activeSr = -1;
  var lastResults = [];
  function onSearchInput() {
    var q = searchInput.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      lastResults = search(q);
      activeSr = -1;
      renderSearchResults(q, lastResults);
    }, 80);
  }
  function renderSearchResults(q, res) {
    if (!q) { searchResults.classList.remove('open'); searchResults.innerHTML = ''; return; }
    if (!res.length) {
      searchResults.innerHTML = '<div class="sr-empty">未寻得「' + escapeHtml(q) + '」相关条目</div>';
      searchResults.classList.add('open');
      return;
    }
    var html = '';
    res.forEach(function (r, idx) {
      var e = r.e;
      var title = highlight(e.t, q, r.where === 't');
      var path = e.p ? e.p.replace(/›/g, ' › ') : '';
      html += '<div class="sr-item" data-idx="' + idx + '" data-key="' + escAttr(e.k) + '">' +
        '<div class="sr-title">' + title + '</div>' +
        '<div class="sr-path">' + escapeHtml(path) + '</div></div>';
    });
    html += '<div class="sr-foot">共 ' + res.length + (res.length === 60 ? '+' : '') + ' 条结果</div>';
    searchResults.innerHTML = html;
    searchResults.classList.add('open');
    searchResults.querySelectorAll('.sr-item').forEach(function (it) {
      it.addEventListener('mousedown', function (ev) {
        ev.preventDefault();
      });
      it.addEventListener('click', function () {
        var k = it.dataset.key;
        searchInput.value = '';
        searchResults.classList.remove('open');
        goEntry(k);
      });
    });
  }
  function highlight(text, q, isTitle) {
    // 简单高亮：子串匹配
    var lower = text.toLowerCase();
    var idx = lower.indexOf(q.toLowerCase());
    if (idx < 0) return escapeHtml(text);
    return escapeHtml(text.slice(0, idx)) + '<mark>' + escapeHtml(text.slice(idx, idx + q.length)) + '</mark>' + escapeHtml(text.slice(idx + q.length));
  }
  function searchKeyNav(ev) {
    var items = searchResults.querySelectorAll('.sr-item');
    if (!items.length) return;
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      activeSr = Math.min(activeSr + 1, items.length - 1);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      activeSr = Math.max(activeSr - 1, 0);
    } else if (ev.key === 'Enter') {
      if (activeSr >= 0 && items[activeSr]) items[activeSr].click();
      else if (items[0]) items[0].click();
      return;
    } else if (ev.key === 'Escape') {
      searchResults.classList.remove('open');
      return;
    } else return;
    items.forEach(function (it, i) { it.classList.toggle('active', i === activeSr); });
    if (items[activeSr]) items[activeSr].scrollIntoView({ block: 'nearest' });
  }
  searchInput.addEventListener('input', onSearchInput);
  searchInput.addEventListener('keydown', searchKeyNav);
  searchInput.addEventListener('focus', function () { if (searchInput.value) onSearchInput(); });
  document.addEventListener('click', function (ev) {
    if (!searchResults.contains(ev.target) && ev.target !== searchInput) searchResults.classList.remove('open');
  });

  // ---------- 路由 ----------
  function goEntry(k, anchor) {
    if (anchor) location.hash = '#/entry/' + encodeURIComponent(k) + '#' + anchor;
    else location.hash = '#/entry/' + encodeURIComponent(k);
  }
  // 跳转到分类/子分类索引页（path 为面包屑路径段，如 "世界" 或 "世界›势力"）
  function goIndex(path) {
    location.hash = '#/index/' + encodeURIComponent(path);
  }
  function route() {
    var h = location.hash;
    var m = h.match(/^#\/entry\/([^#]+)(?:#(.*))?$/);
    if (m) {
      var k = decodeURIComponent(m[1]);
      var anchor = m[2] || '';
      loadEntry(k, anchor);
      return;
    }
    var mi = h.match(/^#\/index\/(.+)$/);
    if (mi) {
      var path = decodeURIComponent(mi[1]);
      renderIndex(path);
      return;
    }
    if (h === '#/changelog') {
      renderChangelog();
      return;
    }
    renderHome();
  }
  window.addEventListener('hashchange', route);

  // ---------- 加载条目 ----------
  var loadedCats = {};
  function loadCat(cat, cb) {
    if (CHUNKS[cat]) { cb(); return; }
    var file = CATFILES[cat];
    if (!file) { cb(); return; }
    var s = document.createElement('script');
    s.src = file;
    s.onload = function () { loadedCats[cat] = true; cb(); };
    s.onerror = function () { cb(); };
    document.head.appendChild(s);
  }
  function loadEntry(k, anchor) {
    var e = byKey[k];
    if (!e) { renderNotFound(k); return; }
    currentEntryKey = k;
    // 记录足迹
    pushHist(k);
    // 标记当前导航高亮
    highlightTree(k);
    closeMobileSidebar();
    hideBackToTop();

    reader.innerHTML = '<div class="loader"><span class="ink-dot"></span><span class="ink-dot"></span><span class="ink-dot"></span></div>';
    // 跳转词条立即回到页面最上方（loader 与正文均从顶部开始）
    scrollToTop(true);

    loadCat(e.c, function () {
      var md = CHUNKS[e.c] && CHUNKS[e.c][k];
      if (md == null) { renderNotFound(k); return; }
      renderArticle(e, md, anchor);
    });
  }

  function renderArticle(e, md, anchor) {
    // 解析元数据块：开头的 > 百科 Key / 层级
    var meta = null;
    var body = md;
    var lines = md.split(/\r?\n/);
    // 去掉首个 # 标题行
    var title = e.t;
    var startIdx = 0;
    if (lines[0] && /^#\s+/.test(lines[0])) { title = lines[0].replace(/^#\s+/, '').trim(); startIdx = 1; }
    // 收集开头连续的 > 引用块作为元数据
    var metaLines = [];
    var j = startIdx;
    while (j < lines.length && /^>\s?/.test(lines[j])) { metaLines.push(lines[j].replace(/^>\s?/, '')); j++; }
    // 仅当元数据含「百科 Key」或「层级」时才作为元数据展示
    if (metaLines.length && /百科\s*Key|层级/.test(metaLines.join('\n'))) {
      meta = metaLines.join('\n');
      // 跳过元数据后的空行
      while (j < lines.length && lines[j].trim() === '') j++;
      body = lines.slice(j).join('\n');
    } else {
      body = lines.slice(startIdx).join('\n');
    }

    var subs = e.s || [];

    var html = '<div class="article">';

    // 面包屑
    if (e.p) {
      var crumbs = e.p.split('›');
      html += '<div class="breadcrumb">';
      // 逐段构建前缀路径，一/二级跳转到对应索引页
      var prefix = '';
      crumbs.forEach(function (c, i) {
        if (i) html += '<span class="sep">›</span>';
        prefix = prefix ? prefix + '›' + c : c;
        var isLast = (i === crumbs.length - 1);
        if (isLast) {
          // 末段为当前条目，不设链接
          html += '<span class="cur">' + escapeHtml(c) + '</span>';
        } else {
          // 一/二级：跳转到该层级的索引页
          html += '<a href="#/index/' + encodeURIComponent(prefix) + '" data-path="' + escapeHtml(prefix) + '">' + escapeHtml(c) + '</a>';
        }
      });
      html += '</div>';
    }

    // 标题 + 收藏
    var favOn = isFav(e.k);
    html += '<div class="title-bar">';
    html += '<h1 class="article-title">' + escapeHtml(title) + '</h1>';
    html += '<button class="fav-btn' + (favOn ? ' on' : '') + '" data-key="' + escapeHtml(e.k) + '" aria-label="收藏" title="' + (favOn ? '取消收藏' : '收藏') + '">' + ICON.star + '</button>';
    html += '</div>';
    html += '<div class="title-rule"></div>';

    // 元数据
    if (meta) {
      html += '<div class="article-meta">' + renderInline(meta) + '</div>';
    }

    // 大纲（子标题 ≥ 3 时显示）
    if (subs.length >= 3) {
      html += '<div class="toc"><div class="toc-title">目 录</div><ul>';
      subs.forEach(function (s) {
        var parts = s.split(':');
        var lvl = parts.shift();
        var txt = parts.join(':');
        html += '<li><a href="#' + slug(txt) + '" data-level="' + lvl + '">' + escapeHtml(txt) + '</a></li>';
      });
      html += '</ul></div>';
    }

    // 正文
    html += '<div class="article-body">' + renderMarkdown(body) + '</div>';
    html += '</div>';

    reader.innerHTML = html;
    scrollToTop(true);
    // 收藏按钮
    var favBtn = reader.querySelector('.fav-btn');
    if (favBtn) {
      favBtn.addEventListener('click', function () {
        toggleFav(e.k);
        var on = isFav(e.k);
        favBtn.classList.toggle('on', on);
        favBtn.title = on ? '取消收藏' : '收藏';
        // 若当前在收藏视图，刷新列表
        if (currentView === 'fav') renderFavList();
      });
    }

    // 绑定内部链接
    reader.querySelectorAll('.article-body a[href^="#/entry/"]').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        var href = a.getAttribute('href');
        location.hash = href.slice(1); // 去 #
      });
    });
    // 锚点链接（同页 #xxx）
    reader.querySelectorAll('.article-body a[href^="#"]:not([href^="#/entry/"])').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        var id = a.getAttribute('href').slice(1);
        scrollToAnchor(id);
      });
    });
    // 大纲锚点
    reader.querySelectorAll('.toc a').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        scrollToAnchor(a.getAttribute('href').slice(1));
      });
    });

    // 跳到锚点
    if (anchor) setTimeout(function () { scrollToAnchor(anchor); }, 50);
    else scrollToTop(true);
  }

  function scrollToAnchor(id) {
    var target = decodeURIComponent(id);
    // 找匹配的标题
    var heads = reader.querySelectorAll('.article-body h2[id], .article-body h3[id], .article-body h4[id]');
    for (var i = 0; i < heads.length; i++) {
      if (heads[i].id === target || decodeURIComponent(heads[i].id) === target) {
        heads[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
  }

  // ---------- 更新日志 ----------
  var CHANGELOG = [
    {
      date: '2026-06-30 ~ 2026-07-01',
      sections: [
        { type: '新增', items: [
          '夜间模式左侧添加字体切换按钮，可以整体切换为微软雅黑',
          '新增安卓端下载按钮'
        ]},
        { type: '优化', items: [
          '页面内容页宽度调整，展示更多信息',
          '页面滚动条优化'
        ]},
        { type: '修复', items: [
          '解决食物、药毒详情页没有具体属性问题【数据从游戏dll解包获取，具体以游戏内为准】',
          '解决部分表格表头展示错误问题',
          '解决部分词条颜色显示错误问题'
        ]}
      ],
      note: 'apk已同步更新，重新下载安装即可'
    }
  ];
  function renderChangelog() {
    currentEntryKey = null;
    closeMobileSidebar();
    hideBackToTop();
    treeEl.querySelectorAll('.tree-row.active').forEach(function (r) { r.classList.remove('active'); });
    scrollToTop(true);
    var html = '<div class="article changelog">';
    html += '<div class="breadcrumb"><span class="cur">更新日志</span></div>';
    html += '<div class="title-bar"><h1 class="article-title">更新日志</h1></div>';
    html += '<div class="title-rule"></div>';
    html += '<div class="article-body">';
    CHANGELOG.forEach(function (log) {
      html += '<h2>' + escapeHtml(log.date) + '</h2>';
      if (log.sections) {
        log.sections.forEach(function (sec) {
          html += '<div class="cl-section cl-' + sec.type + '">';
          html += '<h3><span class="cl-tag">' + escapeHtml(sec.type) + '</span></h3>';
          html += '<ul>';
          sec.items.forEach(function (it) { html += '<li>' + escapeHtml(it) + '</li>'; });
          html += '</ul>';
          html += '</div>';
        });
      } else if (log.items) {
        html += '<ul>';
        log.items.forEach(function (it) { html += '<li>' + escapeHtml(it) + '</li>'; });
        html += '</ul>';
      }
      if (log.note) html += '<blockquote>' + escapeHtml(log.note) + '</blockquote>';
    });
    html += '</div></div>';
    reader.innerHTML = html;
  }

  function renderHome() {
    currentEntryKey = null;
    // 回到首页时折叠侧栏、清除高亮
    treeEl.querySelectorAll('.tree-row.active').forEach(function (r) { r.classList.remove('active'); });
    treeEl.querySelectorAll('.tree-node.open').forEach(function (n) { n.classList.remove('open'); });
    hideBackToTop();
    scrollToTop(true);
    reader.innerHTML =
      '<div class="empty-state">' +
        '<div class="glyph">百</div>' +
        '<h2>太吾绘卷 · 百晓册</h2>' +
        '<p>风起于太吾，墨落于宣纸。<br>于左侧目录择卷而读，或于上方搜索框查阅万千词条。</p>' +
        '<div class="hint">共收录 ' + INDEX.length + ' 篇条目</div>' +
      '</div>';
  }
  function renderNotFound(k) {
    reader.innerHTML =
      '<div class="empty-state not-found">' +
        '<div class="glyph">阙</div>' +
        '<h2>此卷未寻</h2>' +
        '<p>「' + escapeHtml(k) + '」未在百晓册中寻得。<br>或可借搜索另觅其踪。</p>' +
      '</div>';
  }

  // ---------- 索引页（分类 / 子分类） ----------
  // 给定面包屑路径段，在树中找到对应节点
  function nodeAtPath(path) {
    var tree = buildTree();
    var parts = path ? path.split('›') : [];
    var node = { children: tree.children };
    for (var j = 0; j < parts.length; j++) {
      var n = node.children[parts[j]];
      if (!n) return null;
      node = n;
    }
    return node;
  }
  function renderIndex(path) {
    currentEntryKey = null;
    closeMobileSidebar();
    hideBackToTop();
    highlightTreeByPath(path, true);   // 索引页：展开当前节点以露出下级菜单

    var node = nodeAtPath(path);
    if (!node) { renderNotFound(path); return; }

    var parts = path ? path.split('›') : [];
    var title = parts.length ? parts[parts.length - 1] : '百晓册';
    var childNames = Object.keys(node.children);
    // 二级及更深：词条列表用 index-card 卡片网格（与子分类卡片统一）；一级保持文字列表
    var useCardForEntries = parts.length >= 2;
    // 生成词条卡片网格 HTML
    function entriesAsCards(list) {
      var s = '<div class="index-cards">';
      list.forEach(function (e) {
        s += '<a class="index-card" href="#/entry/' + encodeURIComponent(e.k) + '">' +
          '<span class="ic-name">' + escapeHtml(e.t) + '</span>' +
          '<span class="ic-arrow">›</span></a>';
      });
      return s + '</div>';
    }

    var html = '<div class="index-page">';
    // 面包屑（末段为当前索引页，前置段为上级索引页）
    if (parts.length) {
      html += '<div class="breadcrumb">';
      var prefix = '';
      parts.forEach(function (c, i) {
        if (i) html += '<span class="sep">›</span>';
        prefix = prefix ? prefix + '›' + c : c;
        if (i === parts.length - 1) html += '<span class="cur">' + escapeHtml(c) + '</span>';
        else html += '<a href="#/index/' + encodeURIComponent(prefix) + '">' + escapeHtml(c) + '</a>';
      });
      html += '</div>';
    }
    html += '<h1 class="index-title">' + escapeHtml(title) + '</h1>';
    html += '<div class="title-rule"></div>';

    if (!childNames.length) {
      // 无下级目录，但可能含多篇同路径条目（buildTree 折叠情形）
      var hereOnly = entriesAtPath(path);
      if (hereOnly.length) {
        if (useCardForEntries) {
          html += entriesAsCards(hereOnly);
        } else {
          html += '<div class="index-entries"><ul>';
          hereOnly.forEach(function (e) {
            html += '<li><a href="#/entry/' + encodeURIComponent(e.k) + '">' + escapeHtml(e.t) + '</a></li>';
          });
          html += '</ul></div>';
        }
      } else {
        html += '<div class="empty-state" style="margin:8vh auto"><div class="glyph">空</div><p>此卷暂无下级目录。</p></div>';
      }
    } else {
      // 判断子节点是「子分类（含下级或含多篇条目）」还是「单篇词条（叶子）」
      var subs = [], entries = [];
      childNames.forEach(function (name) {
        var c = node.children[name];
        var childPath = path ? path + '›' + name : name;
        // 以 INDEX 实际条目数为准（buildTree 折叠时树中仅保留首篇）
        var cnt = countEntriesByPath(childPath);
        var hasSub = Object.keys(c.children).length > 0;
        // 有下级目录，或该路径下有多篇条目 → 视为子分类
        if (hasSub || cnt > 1) {
          subs.push({ node: c, path: childPath, count: cnt });
        } else if (c.entry) {
          entries.push(c.entry);
        }
      });
      // 子分类卡片
      if (subs.length) {
        html += '<div class="index-cards">';
        subs.forEach(function (s) {
          html += '<a class="index-card" href="#/index/' + encodeURIComponent(s.path) + '">' +
            '<span class="ic-name">' + escapeHtml(s.node.name) + '</span>' +
            '<span class="ic-count">' + s.count + ' 篇</span>' +
            '<span class="ic-arrow">›</span></a>';
        });
        html += '</div>';
      }
      // 词条列表（含当前层级直接挂载的所有条目，处理 buildTree 折叠的多篇情形）
      var hereEntries = entries.concat(entriesAtPath(path));
      if (hereEntries.length) {
        if (useCardForEntries) {
          html += entriesAsCards(hereEntries);
        } else {
          html += '<div class="index-entries"><ul>';
          hereEntries.forEach(function (e) {
            html += '<li><a href="#/entry/' + encodeURIComponent(e.k) + '">' + escapeHtml(e.t) + '</a></li>';
          });
          html += '</ul></div>';
        }
      }
    }
    html += '</div>';

    reader.innerHTML = html;
    scrollToTop(true);  }
  // 统计某路径下（含自身及子层）的条目数，以 INDEX 实际数据为准
  function countEntriesByPath(path) {
    var n = 0;
    var prefix = path + '›';
    for (var i = 0; i < INDEX.length; i++) {
      var p = INDEX[i].p;
      if (p === path || p.indexOf(prefix) === 0) n++;
    }
    return n;
  }
  // 取路径恰好等于 path 的所有条目（用于 buildTree 折叠的多篇词条情形）
  function entriesAtPath(path) {
    var out = [];
    if (!path) return out;
    for (var i = 0; i < INDEX.length; i++) {
      if (INDEX[i].p === path) out.push(INDEX[i]);
    }
    return out;
  }

  // ---------- Markdown 渲染（极简，针对本数据特性） ----------
  // 块级：标题、表格、列表、引用、水平线、段落
  function renderMarkdown(md) {
    var lines = md.replace(/\r/g, '').split('\n');
    var out = [];
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];

      // 表格：连续的 | 行（至少含表头+分隔行）
      if (line.indexOf('|') >= 0 && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].indexOf('-') >= 0) {
        var tbl = [];
        while (i < lines.length && lines[i].indexOf('|') >= 0) { tbl.push(lines[i]); i++; }
        out.push(renderTable(tbl));
        continue;
      }
      // 标题
      var hm = line.match(/^(#{2,4})\s+(.*)$/);
      if (hm) {
        var lvl = hm[1].length;
        out.push('<h' + lvl + ' id="' + slug(hm[2]) + '">' + renderInline(hm[2]) + '</h' + lvl + '>');
        i++; continue;
      }
      // 水平线
      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
      // 引用块（连续 >）
      if (/^>\s?/.test(line)) {
        var bq = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { bq.push(lines[i].replace(/^>\s?/, '')); i++; }
        out.push('<blockquote>' + renderInline(bq.join('<br>')) + '</blockquote>');
        continue;
      }
      // 无序列表
      if (/^\s*[-*+]\s+/.test(line)) {
        var items = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          items.push('<li>' + renderInline(lines[i].replace(/^\s*[-*+]\s+/, '')) + '</li>');
          i++;
        }
        out.push('<ul>' + items.join('') + '</ul>');
        continue;
      }
      // 有序列表
      if (/^\s*\d+\.\s+/.test(line)) {
        var olItems = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          olItems.push('<li>' + renderInline(lines[i].replace(/^\s*\d+\.\s+/, '')) + '</li>');
          i++;
        }
        out.push('<ol>' + olItems.join('') + '</ol>');
        continue;
      }
      // 空行
      if (line.trim() === '') { i++; continue; }
      // 段落：连续非空行
      var para = [];
      while (i < lines.length && lines[i].trim() !== '' &&
        !/^(#{2,4})\s/.test(lines[i]) && !/^>\s?/.test(lines[i]) &&
        !/^\s*[-*+]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i]) &&
        !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i]) &&
        !(lines[i].indexOf('|') >= 0 && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].indexOf('-') >= 0)) {
        para.push(lines[i]); i++;
      }
      if (para.length) out.push('<p>' + renderInline(para.join('<br>')) + '</p>');
    }
    return out.join('\n');
  }

  function renderTable(tbl) {
    // 解析行：每行按 | 分割
    var rows = tbl.map(function (r) {
      r = r.trim();
      if (r.startsWith('|')) r = r.slice(1);
      if (r.endsWith('|')) r = r.slice(0, -1);
      return r.split('|').map(function (c) { return c.trim(); });
    });
    if (rows.length < 2) return '';
    var header = rows[0];
    var body = rows.slice(2); // 跳过分隔行 rows[1]
    // 统一列数：以最大列数为准，不足补空，保证列对齐
    var maxCols = header.length;
    body.forEach(function (r) { if (r.length > maxCols) maxCols = r.length; });
    while (header.length < maxCols) header.push('');
    body.forEach(function (r) { while (r.length < maxCols) r.push(''); });

    var html = '<div class="table-scroll"><table><thead><tr>';
    header.forEach(function (c) { html += '<th>' + renderInline(c) + '</th>'; });
    html += '</tr></thead><tbody>';
    body.forEach(function (r) {
      html += '<tr>';
      r.forEach(function (c) { html += '<td>' + renderInline(c) + '</td>'; });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  // 行内：链接、加粗、斜体、行内代码、<span> 保留
  // 顺序很关键：先处理链接（含 span 内部的 [text](url) 形式），再保护剩余 span
  // 游戏命名颜色 → hex（参考导出工具 export_baixiao.py 的 NAMED_COLORS / color_value）
  // 毒类按语义分配辨识色，其余走导出工具的 fallback 暗黄
  var NAMED_COLORS = {
    specialyellow: '#ffd36a',
    brightblue: '#76d7ff',
    white: '#1A1A1A',
    brightred: '#ff5331',
    pinkyellow: '#ffd36a',
    coldpoison: '#66c2d6',
    hotpoison: '#ff9f55',
    redpoison: '#ff5331',
    rottenpoison: '#9eb767',
    illusorypoison: '#b975ff',
    gloomypoison: '#79c98f'
  };
  function colorValue(token) {
    token = token.trim().replace(/^#/, '');
    if (NAMED_COLORS[token]) return NAMED_COLORS[token];
    if (/^f{6,8}$/i.test(token) || /^ffffff(f?)+$/i.test(token)) return '#1A1A1A';
    if (/^[0-9a-fA-F]{6,8}$/.test(token)) return '#' + token.slice(0, 6);
    if (token.indexOf('_') >= 0) return '#9eb767';
    return '#d8c28a';
  }
  // 把 <color=#name>...</color> 转成 <span style="color:#hex">...</span>
  // 支持嵌套：循环替换直到无 <color> 标签（每次处理最内层已闭合的）
  function convertColorTags(s) {
    var prev, cur = s;
    do {
      prev = cur;
      cur = cur.replace(/<color=([^>]+)>([\s\S]*?)<\/color>/g, function (m, token, inner) {
        return '<span style="color:' + colorValue(token) + '">' + inner + '</span>';
      });
    } while (cur !== prev);
    return cur;
  }

  function renderInline(s) {
    if (!s) return '';
    // 行内代码先保护（避免代码内容被处理）
    var codes = [];
    s = s.replace(/`([^`]+)`/g, function (m, c) { codes.push(c); return '\u0000CD' + (codes.length - 1) + '\u0000'; });
    // 游戏 <color=#name>...</color> 标签 → 标准 <span style="color:...">
    s = convertColorTags(s);
    // 链接 [text](url) —— 先于 span 保护，使 <span>[text](url)</span> 中的链接被转换
    // 链接文本可能含 span（[<span>t</span>](url)），递归 renderInline 处理
    s = s.replace(/\[([^\]]*)\]\(([^)]+)\)/g, function (m, txt, url) {
      txt = renderInline(txt);
      var hasColor = /<span[^>]*style=["'][^"']*color:/i.test(txt);
      var rank = getEntryRankFromUrl(url);
      if (rank) txt = applyRankColorToInlineSpans(txt);
      var cls = hasColor || rank ? ' class="' + (hasColor ? 'colored-link' : '') + (rank ? (hasColor ? ' ' : '') + 'rank-link' : '') + '"' : '';
      var rankAttr = rank ? ' data-rank="' + rank + '"' : '';
      if (url.indexOf('#/entry/') === 0) {
        return '<a' + cls + rankAttr + ' href="' + url + '">' + txt + '</a>';
      } else if (url.charAt(0) === '#') {
        return '<a' + cls + rankAttr + ' href="' + url + '">' + txt + '</a>';
      } else if (/^https?:\/\//.test(url)) {
        return '<a' + cls + rankAttr + ' href="' + url + '" target="_blank" rel="noopener">' + txt + '</a>';
      }
      return '<a' + cls + rankAttr + ' href="' + url + '">' + txt + '</a>';
    });
    // 保护 <span ...>...</span>（游戏术语配色，此时内部链接已转为 <a>）
    var spans = [];
    s = s.replace(/<span[^>]*>[\s\S]*?<\/span>/g, function (m) { spans.push(m); return '\u0000SP' + (spans.length - 1) + '\u0000'; });
    // 加粗 **..** 或 __..__
    s = s.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    // 斜体 *..* 或 _.._
    s = s.replace(/(^|[^*])\*([^\*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
    // 还原代码
    s = s.replace(/\u0000CD(\d+)\u0000/g, function (m, n) { return '<code>' + escapeHtml(codes[+n]) + '</code>'; });
    // 还原 span
    s = s.replace(/\u0000SP(\d+)\u0000/g, function (m, n) { return normalizeGameColorSpan(spans[+n]); });
    return s;
  }

  function normalizeGameColorSpan(html) {
    return html.replace(/<span\b([^>]*)style=(["'])([^"']*color\s*:\s*(#[0-9a-fA-F]{6,8})[^"']*)\2([^>]*)>/i,
      function (m, before, quote, style, color, after) {
        var hex = color.replace('#', '').toLowerCase();
        var attrs = (before + after).replace(/\sclass=(["'])(.*?)\1/i, function (cm, q, cls) {
          return ' class=' + q + cls + ' game-color' + q;
        });
        if (!/\sclass=/i.test(attrs)) attrs += ' class="game-color"';
        if (!/\sdata-color=/i.test(attrs)) attrs += ' data-color="' + hex + '"';
        return '<span' + attrs + ' style=' + quote + style + quote + '>';
      });
  }

  function applyRankColorToInlineSpans(html) {
    return html.replace(/(<span\b[^>]*style=(["'])(?=[^"']*color\s*:)[^"']*?)color\s*:\s*#[0-9a-fA-F]{6,8}/ig,
      '$1color:var(--rank-color)');
  }

  function addEntryNameAlias(name, entry) {
    var key = normalizeEntryName(name);
    if (!key) return;
    if (!byEntryName[key]) byEntryName[key] = entry;
  }

  function normalizeEntryName(name) {
    if (!name) return '';
    name = String(name).trim();
    if (name.charAt(0) === '《' && name.charAt(name.length - 1) === '》') {
      name = name.slice(1, -1).trim();
    }
    return name;
  }

  // ---------- 锚点 slug ----------
  function getEntryRankFromUrl(url) {
    if (!url || url.indexOf('#/entry/') !== 0) return '';
    var raw = url.slice('#/entry/'.length).split('#')[0];
    var key;
    try { key = decodeURIComponent(raw); } catch (e) { key = raw; }
    var entry = byKey[key] || byEntryName[normalizeEntryName(key)];
    if (!entry) return '';
    var text = (entry.t || '') + ' ' + (entry.x || '');
    var m = text.match(/[上中下极超绝秘奇]\s*[·?]\s*([一二三四五六七八九])品/) ||
      text.match(/([一二三四五六七八九])\s*[品阶]/);
    if (!m) return '';
    var map = { '一': '1', '二': '2', '三': '3', '四': '4', '五': '5', '六': '6', '七': '7', '八': '8', '九': '9' };
    return map[m[1]] || '';
  }

  function slug(text) {
    // GitHub 风格：去标签、小写、空格转-、去标点
    var s = text.replace(/<[^>]+>/g, '').trim().toLowerCase();
    s = s.replace(/[\s]+/g, '-').replace(/[^\u4e00-\u9fa5a-z0-9_-]/g, '');
    return encodeURIComponent(s);
  }

  // ---------- 树高亮 ----------
  // 折叠所有节点，仅展开当前条目所在的分支并高亮该行
  function highlightTree(k) {
    var e = byKey[k];
    if (!e) return;
    highlightTreeByPath(e.p);
  }
  // 按面包屑路径高亮：展开该路径的祖先分支，高亮末段节点
  // expandSelf=true 时同时展开当前节点本身（用于索引页，露出下级菜单）
  function highlightTreeByPath(path, expandSelf) {
    // 清除高亮、折叠所有节点
    treeEl.querySelectorAll('.tree-row.active').forEach(function (r) { r.classList.remove('active'); });
    treeEl.querySelectorAll('.tree-node.open').forEach(function (n) { n.classList.remove('open'); });
    // 仅在目录视图下展开分支；收藏/足迹视图保持原样
    if (currentView !== 'tree') return;
    if (!path) return;

    // 定位路径对应的 tree-node
    var node = findTreeNodeByPath(path);
    if (!node) {
      renderTree();
      node = findTreeNodeByPath(path);
      if (!node) return;
    }
    // 展开所有祖先 tree-node
    var p = node.parentElement;
    while (p && p !== treeEl) {
      if (p.classList && p.classList.contains('tree-node')) p.classList.add('open');
      p = p.parentElement;
    }
    // 索引页：展开当前节点本身以露出下级菜单
    if (expandSelf) node.classList.add('open');
    // 高亮该节点的行
    var row = node.querySelector(':scope > .tree-row');
    if (row) {
      row.classList.add('active');
      try { row.scrollIntoView({ block: 'nearest' }); } catch (err) {}
    }
  }
  function findTreeNodeByPath(path) {
    var nodes = treeEl.querySelectorAll('.tree-node[data-path]');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute('data-path') === path) return nodes[i];
    }
    return null;
  }

  // ---------- 移动端侧栏 ----------
  function openMobileSidebar() { sidebar.classList.add('open'); scrim.classList.add('show'); }
  function closeMobileSidebar() { sidebar.classList.remove('open'); scrim.classList.remove('show'); }
  menuToggle && menuToggle.addEventListener('click', openMobileSidebar);
  scrim && scrim.addEventListener('click', closeMobileSidebar);

  // ---------- 返回顶部 ----------
  // 阅读区随页面整体滚动（顶栏 sticky），故监听 window 滚动
  // 统一的页面归顶（替换 reader.scrollTop=0，因 reader 不产生自身滚动）
  function scrollToTop(immediate) {
    if (immediate) window.scrollTo(0, 0);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  var bttTimer = null;
  function onScroll() {
    if (bttTimer) return;
    bttTimer = setTimeout(function () {
      bttTimer = null;
      var y = window.scrollY || window.pageYOffset || (document.documentElement && document.documentElement.scrollTop) || 0;
      if (y > 320) backToTop.classList.add('show');
      else backToTop.classList.remove('show');
    }, 80);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  // 切换条目时隐藏（renderArticle/loadEntry 已将页面归顶，滚动监听也会随之刷新）
  function hideBackToTop() { backToTop && backToTop.classList.remove('show'); }
  backToTop && backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });


  // ---------- 工具 ----------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escAttr(s) { return escapeHtml(s); }

  // ---------- 启动 ----------
  initTheme();
  initFontMode();
  renderSideTabs();
  renderTree();
  route();
})();
