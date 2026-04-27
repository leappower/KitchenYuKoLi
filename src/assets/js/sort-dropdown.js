/**
 * SortDropdown — custom sort selector
 * PC (>=1280): absolute dropdown below trigger
 * Tablet (768-1279): centered popover with backdrop
 * Mobile (<768): iOS-style action sheet (bottom sheet)
 */
(function() {
  'use strict';

  var styleId = 'sort-dropdown-global-style';
  var outsideBound = 'sortDropdownOutsideBound';

  function isMobile() { return window.innerWidth < 768; }
  function isTablet() { return window.innerWidth >= 768 && window.innerWidth < 1280; }

  function injectStyles() {
    if (document.getElementById(styleId)) return;
    var s = document.createElement('style');
    s.id = styleId;
    s.textContent = [
      /* Shared */
      '.sort-trigger { cursor: pointer; user-select: none; }',
      '.sort-arrow { transition: transform 0.2s ease; display: inline-flex; }',

      /* PC dropdown */
      '.sort-dropdown-menu { display:none; position:absolute; top:calc(100% + 4px); right:0; min-width:120px; background:white; border:1px solid #e2e8f0; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.12); padding:6px; z-index:200; overflow:hidden; }',
      '.sort-dropdown-item { display:block; width:100%; text-align:left; padding:8px 14px; border:none; background:none; font-size:13px; font-weight:500; color:#334155; cursor:pointer; border-radius:8px; transition:background 0.15s; }',
      '.sort-dropdown-item:hover { background: #f1f5f9; }',
      '.sort-dropdown-item.is-active { background: #f1f5f9; font-weight: 700; }',

      /* Dark mode (PC dropdown) */
      'html.dark .sort-dropdown-menu { background: #1e293b; border-color: #334155; }',
      'html.dark .sort-dropdown-item { color: #cbd5e1; }',
      'html.dark .sort-dropdown-item:hover { background: #334155; }',
      'html.dark .sort-dropdown-item.is-active { background: #334155; color: #f8fafc; }',

      /* Action sheet (mobile) */
      '.sort-sheet-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.32); z-index:300; opacity:0; transition:opacity 0.25s ease; pointer-events:none; }',
      '.sort-sheet-overlay.is-open { opacity:1; pointer-events:auto; }',
      '.sort-sheet { position:fixed; left:8px; right:8px; bottom:0; z-index:310; background:rgba(255,255,255,0.95); backdrop-filter:blur(40px) saturate(200%); -webkit-backdrop-filter:blur(40px) saturate(200%); border-radius:16px 16px 0 0; padding:0 0 env(safe-area-inset-bottom); transform:translateY(100%); transition:transform 0.3s cubic-bezier(0.32,0.72,0,1); pointer-events:none; }',
      '.sort-sheet.is-open { transform:translateY(0); pointer-events:auto; }',
      'html.dark .sort-sheet { background:rgba(44,44,46,0.95); }',
      '.sort-sheet-handle { display:flex; justify-content:center; padding:10px 0 4px; }',
      '.sort-sheet-handle span { width:36px; height:5px; border-radius:3px; background:rgba(60,60,67,0.2); }',
      'html.dark .sort-sheet-handle span { background:rgba(235,235,245,0.2); }',
      '.sort-sheet-title { text-align:center; font-size:13px; font-weight:600; color:rgba(60,60,67,0.5); padding:4px 0 8px; }',
      'html.dark .sort-sheet-title { color:rgba(235,235,245,0.5); }',
      '.sort-sheet-item { display:block; width:100%; text-align:center; padding:14px 16px; border:none; background:none; font-size:18px; font-weight:400; color:#1d1d1f; cursor:pointer; border-bottom:0.5px solid rgba(60,60,67,0.1); -webkit-tap-highlight-color:transparent; transition:background 0.1s; }',
      '.sort-sheet-item:active { background:rgba(236,91,19,0.06); }',
      'html.dark .sort-sheet-item { color:#f5f5f7; border-bottom-color:rgba(235,235,245,0.08); }',
      'html.dark .sort-sheet-item:active { background:rgba(236,91,19,0.10); }',
      '.sort-sheet-item.is-active { color:#ec5b13; font-weight:600; }',
      'html.dark .sort-sheet-item.is-active { color:#ff8c5a; }',
      '.sort-sheet-cancel { display:block; width:100%; text-align:center; padding:14px 16px; border:none; background:none; font-size:18px; font-weight:600; color:#ec5b13; cursor:pointer; border-top:0.5px solid rgba(60,60,67,0.1); -webkit-tap-highlight-color:transparent; margin-top:6px; }',
      '.sort-sheet-cancel:active { background:rgba(236,91,19,0.06); }',

      /* Scrollable category tabs */
      '.category-scroll-container::-webkit-scrollbar { display: none; }',
      '.category-scroll-container { -webkit-overflow-scrolling: touch; }',

      /* Sort trigger open state */
      '.sort-trigger-open .sort-arrow { transform: rotate(180deg); }',
    ].join('\n');
    document.head.appendChild(s);
  }

  function init(root) {
    var scope = root || document;
    var triggers = scope.querySelectorAll('[data-sort-select]');

    injectStyles();

    triggers.forEach(function(wrap) {
      if (wrap._sortDropdownInit) return;
      wrap._sortDropdownInit = true;

      var trigger = wrap.querySelector('.sort-trigger');
      var select = wrap.querySelector('select');
      if (!trigger) return;

      // Read options from native <select>
      var options = [];
      if (select) {
        select.querySelectorAll('option').forEach(function(opt) {
          options.push({ value: opt.value, label: opt.textContent.trim() });
        });
        select.style.display = 'none';
      }

      // Set initial label
      var currentVal = select ? select.value : (options[0] ? options[0].value : '');
      var currentLabel = '';
      options.forEach(function(o) {
        if (o.value === currentVal) currentLabel = o.label;
      });
      if (!currentLabel && options.length) currentLabel = options[0].label;
      var labelEl = trigger.querySelector('.sort-label');
      if (labelEl) labelEl.textContent = currentLabel;

      // Click handler — detect viewport and open appropriate UI
      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        closeAll();
        if (isMobile()) {
          openActionSheet(options, currentVal, trigger, select, wrap);
        } else if (isTablet()) {
          openPopover(options, currentVal, trigger, select, wrap);
        } else {
          openDropdown(options, currentVal, trigger, select, wrap);
        }
      });
    });

    // Close on outside click (for PC dropdown only)
    if (!document[outsideBound]) {
      document[outsideBound] = true;
      document.addEventListener('click', function() {
        closeAll();
      });
    }
  }

  // ─── PC: absolute dropdown ─────────────────────────────────────

  function openDropdown(options, currentVal, trigger, select, wrap) {
    var menuId = wrap.getAttribute('data-sort-select');
    var menu = document.getElementById(menuId);

    // Remove old menu if exists
    if (!menu) {
      menu = document.createElement('div');
      menu.id = menuId;
      menu.className = 'sort-dropdown-menu';
      wrap.style.position = 'relative';
      wrap.appendChild(menu);
    }

    // Rebuild items
    menu.innerHTML = '';
    options.forEach(function(opt) {
      var item = document.createElement('button');
      item.className = 'sort-dropdown-item' + (opt.value === currentVal ? ' is-active' : '');
      item.dataset.value = opt.value;
      item.textContent = opt.label;
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        selectOption(opt.value, opt.label, trigger, select);
        menu.style.display = 'none';
        trigger.classList.remove('sort-trigger-open');
      });
      menu.appendChild(item);
    });

    menu.style.display = 'block';
    trigger.classList.add('sort-trigger-open');
  }

  // ─── Tablet: centered popover ─────────────────────────────────

  function openPopover(options, currentVal, trigger, select, wrap) {
    var menuId = wrap.getAttribute('data-sort-select');
    var popover = document.getElementById(menuId);

    if (!popover) {
      popover = document.createElement('div');
      popover.id = menuId;
      popover.className = 'sort-dropdown-menu';
      popover.style.position = 'fixed';
      popover.style.top = '50%';
      popover.style.left = '50%';
      popover.style.transform = 'translate(-50%, -50%)';
      popover.style.zIndex = '310';
      popover.style.minWidth = '180px';
      document.body.appendChild(popover);
    }

    // Add backdrop
    var backdrop = document.getElementById('sort-backdrop-popover');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'sort-backdrop-popover';
      backdrop.className = 'sort-sheet-overlay';
      backdrop.addEventListener('click', function() { closeAll(); });
      document.body.appendChild(backdrop);
    }
    requestAnimationFrame(function() { backdrop.classList.add('is-open'); });

    // Rebuild items
    popover.innerHTML = '';
    options.forEach(function(opt) {
      var item = document.createElement('button');
      item.className = 'sort-dropdown-item' + (opt.value === currentVal ? ' is-active' : '');
      item.dataset.value = opt.value;
      item.textContent = opt.label;
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        selectOption(opt.value, opt.label, trigger, select);
        closeAll();
      });
      popover.appendChild(item);
    });

    popover.style.display = 'block';
    trigger.classList.add('sort-trigger-open');
  }

  // ─── Mobile: iOS action sheet ──────────────────────────────────

  function openActionSheet(options, currentVal, trigger, select, wrap) {
    // Ensure single instance
    var overlay = document.getElementById('sort-sheet-overlay');
    var sheet = document.getElementById('sort-sheet');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sort-sheet-overlay';
      overlay.className = 'sort-sheet-overlay';
      document.body.appendChild(overlay);
    }
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'sort-sheet';
      sheet.className = 'sort-sheet';
      document.body.appendChild(sheet);
    }

    // Build content
    var html = '<div class="sort-sheet-handle"><span></span></div>';
    html += '<div class="sort-sheet-title">排序方式</div>';
    options.forEach(function(opt) {
      var cls = 'sort-sheet-item' + (opt.value === currentVal ? ' is-active' : '');
      html += '<button class="' + cls + '" data-value="' + opt.value + '">' + opt.label + '</button>';
    });
    html += '<button class="sort-sheet-cancel">取消</button>';
    sheet.innerHTML = html;

    // Event handlers
    sheet.querySelectorAll('.sort-sheet-item').forEach(function(item) {
      item.addEventListener('click', function() {
        var val = this.dataset.value;
        var label = this.textContent.trim();
        selectOption(val, label, trigger, select);
        closeAll();
      });
    });

    sheet.querySelector('.sort-sheet-cancel').addEventListener('click', function() {
      closeAll();
    });

    overlay.addEventListener('click', function() { closeAll(); });

    // Animate in
    requestAnimationFrame(function() {
      overlay.classList.add('is-open');
      sheet.classList.add('is-open');
    });

    trigger.classList.add('sort-trigger-open');
  }

  // ─── Helpers ───────────────────────────────────────────────────

  function selectOption(value, label, trigger, select) {
    // Update trigger label
    var labelEl = trigger.querySelector('.sort-label');
    if (labelEl) labelEl.textContent = label;
    // Update native select
    if (select) {
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function closeAll() {
    // Close PC dropdown menus
    document.querySelectorAll('.sort-dropdown-menu').forEach(function(m) {
      // Only close fixed (popover) and inline ones; keep tablet ones in DOM
      if (m.style.position === 'fixed') {
        m.style.display = 'none';
      } else {
        m.style.display = 'none';
      }
    });
    // Close popover backdrop
    var popoverBackdrop = document.getElementById('sort-backdrop-popover');
    if (popoverBackdrop) popoverBackdrop.classList.remove('is-open');

    // Close action sheet
    var overlay = document.getElementById('sort-sheet-overlay');
    var sheet = document.getElementById('sort-sheet');
    if (overlay) overlay.classList.remove('is-open');
    if (sheet) sheet.classList.remove('is-open');

    // Reset trigger arrows
    document.querySelectorAll('.sort-trigger').forEach(function(t) {
      t.classList.remove('sort-trigger-open');
    });
  }

  // ─── Init ──────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('spa:load', function() { setTimeout(init, 50); });
  document.addEventListener('product-data-ready', function() { setTimeout(init, 100); });

  window.SortDropdown = { init: init };
})();
