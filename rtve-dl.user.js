// ==UserScript==
// @name         RTVE Video and Subtitle Downloader
// @namespace    https://github.com/Myst1cX/rtve-video-dl
// @version      1.2
// @description  A RTVE downloader powered by downloadvideos.tv. Displays the downloadvideos.tv widget on RTVE videos. Works with both HLS and encrypted video streams.
// @author       Myst1cX
// @match        https://www.rtve.es/*
// @run-at       document-idle
// @grant        GM_setClipboard
// @homepageURL  https://github.com/Myst1cX/rtve-video-dl
// @supportURL   https://github.com/Myst1cX/rtve-dl/issues
// @updateURL    https://raw.githubusercontent.com/Myst1cX/rtve-video-dl/main/rtve-video-dl.user.js
// @downloadURL  https://raw.githubusercontent.com/Myst1cX/rtve-video-dl/main/rtve-video-dl.user.js
// ==/UserScript==

(function () {
    'use strict';

    const WIDGET_ID = 'rtve-dl-widget';
    const STORAGE_KEY = 'rtve-dl-state';
    const SPA_NAV_DELAY = 300; // ms to wait after navigation before reading the new URL
    const CSS_PX = /^-?\d+(\.\d+)?px$/;

    // ── Persistence ───────────────────────────────────────────────────────────

    function loadState() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
        catch (_) { return {}; }
    }

    function saveState(patch) {
        try {
            const state = loadState();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.assign(state, patch)));
        } catch (_) {}
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    function copyToClipboard(text) {
        if (typeof GM_setClipboard !== 'undefined') { GM_setClipboard(text); return; }
        if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    }

    function updateUrlField() {
        const input = document.getElementById('rtve-dl-url-input');
        if (input) input.value = location.href;
    }

    // ── Widget ────────────────────────────────────────────────────────────────

    function createWidget() {
        if (document.getElementById(WIDGET_ID)) {
            updateUrlField();
            return;
        }

        const savedState = loadState();

        const widget = document.createElement('div');
        widget.id = WIDGET_ID;

        const hasSavedPos = CSS_PX.test(savedState.left) && CSS_PX.test(savedState.top);

        widget.style.cssText = [
            'position:fixed',
            hasSavedPos ? `left:${savedState.left}` : 'right:24px',
            hasSavedPos ? `top:${savedState.top}` : 'bottom:24px',
            'z-index:2147483647',
            'width:324px',
            'background:#141414',
            'border:1px solid rgba(255,255,255,.09)',
            'border-radius:12px',
            'box-shadow:0 16px 48px rgba(0,0,0,.8),0 1px 0 rgba(255,255,255,.06) inset',
            'font-family:Arial,sans-serif',
            'font-size:13px',
            'color:#e0e0e0',
            'user-select:none',
        ].join(';');

        widget.innerHTML = `
<div id="rtve-dl-header" style="
    display:flex;justify-content:space-between;align-items:center;
    padding:9px 12px;background:#0d0d0d;border-radius:12px 12px 0 0;cursor:move;
    border-bottom:1px solid rgba(255,255,255,.07);">
  <span style="color:#e94560;font-weight:700;font-size:13px;letter-spacing:.4px;text-transform:uppercase;">📥 RTVE Downloader</span>
  <div style="display:flex;gap:2px;">
    <button id="rtve-dl-min" title="Minimise"
      style="background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:17px;line-height:1;padding:0 5px;transition:color .15s;">−</button>
    <button id="rtve-dl-close" title="Close"
      style="background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:17px;line-height:1;padding:0 5px;transition:color .15s;">×</button>
  </div>
</div>
<div id="rtve-dl-body" style="padding:10px 10px 13px;">
  <iframe
    width="304" height="46"
    src="//www.descargavideos.tv/form.php?l=300&t=f2&c=negro"
    name="form_dv"
    allowtransparency="true"
    frameborder="0"
    scrolling="no"
    style="display:block;border:0;">
  </iframe>
  <div style="margin-top:10px;border-top:1px solid rgba(255,255,255,.07);padding-top:10px;">
    <div style="color:rgba(255,255,255,.38);font-size:11px;margin-bottom:6px;letter-spacing:.15px;">
      Current page URL — paste into the widget above:
    </div>
    <div style="display:flex;gap:6px;">
      <input id="rtve-dl-url-input" type="text" readonly
        style="flex:1;min-width:0;background:#0d0d0d;border:1px solid rgba(255,255,255,.1);
               color:rgba(255,255,255,.7);padding:5px 8px;border-radius:6px;font-size:11px;outline:none;" />
      <button id="rtve-dl-copy"
        style="background:#e94560;border:none;color:#fff;padding:5px 11px;
               border-radius:6px;cursor:pointer;font-size:11px;white-space:nowrap;font-weight:700;
               letter-spacing:.3px;transition:background .2s;">Copy</button>
    </div>
  </div>
</div>`;

        document.body.appendChild(widget);

        updateUrlField();

        // Minimise / expand
        let minimised = savedState.minimised || false;
        const body = document.getElementById('rtve-dl-body');
        const minBtn = document.getElementById('rtve-dl-min');

        function applyMinimised() {
            body.style.display = minimised ? 'none' : '';
            minBtn.textContent = minimised ? '+' : '−';
            minBtn.title = minimised ? 'Expand' : 'Minimise';
        }

        applyMinimised();

        minBtn.addEventListener('click', () => {
            minimised = !minimised;
            applyMinimised();
            saveState({ minimised });
        });

        // Close
        document.getElementById('rtve-dl-close').addEventListener('click', () => {
            widget.remove();
        });

        // Copy button
        const copyBtn = document.getElementById('rtve-dl-copy');
        let copyTimer;
        copyBtn.addEventListener('click', () => {
            copyToClipboard(document.getElementById('rtve-dl-url-input').value);
            copyBtn.textContent = '✓ Copied';
            copyBtn.style.background = '#28a745';
            clearTimeout(copyTimer);
            copyTimer = setTimeout(() => {
                copyBtn.textContent = 'Copy';
                copyBtn.style.background = '#e94560';
            }, 2000);
        });

        // Drag
        makeDraggable(widget, document.getElementById('rtve-dl-header'));
    }

    function makeDraggable(popup, handle) {
        let dragging = false, offsetX = 0, offsetY = 0;

        handle.addEventListener('mousedown', (e) => {
            dragging = true;
            const rect = popup.getBoundingClientRect();
            // Switch from bottom/right anchoring to top/left so movement is natural
            popup.style.bottom = 'auto';
            popup.style.right = 'auto';
            popup.style.left = rect.left + 'px';
            popup.style.top = rect.top + 'px';
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            popup.style.left = (e.clientX - offsetX) + 'px';
            popup.style.top = (e.clientY - offsetY) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (dragging) {
                dragging = false;
                saveState({ left: popup.style.left, top: popup.style.top });
            }
        });
    }

    // ── Video detection ───────────────────────────────────────────────────────

    const attachedVideos = new WeakSet();

    function attachVideoListeners() {
        document.querySelectorAll('video').forEach((video) => {
            if (attachedVideos.has(video)) return;
            attachedVideos.add(video);
            video.addEventListener('play', createWidget);
        });
    }

    // Watch for dynamically inserted <video> elements (SPA)
    const videoWatcher = new MutationObserver(attachVideoListeners);
    videoWatcher.observe(document.documentElement, { childList: true, subtree: true });

    // Update URL field on SPA navigation
    ['pushState', 'replaceState'].forEach((method) => {
        const original = history[method];
        history[method] = function (...args) {
            original.apply(this, args);
            setTimeout(updateUrlField, SPA_NAV_DELAY);
        };
    });
    window.addEventListener('popstate', updateUrlField);

    // Run once on initial load
    attachVideoListeners();

})();
