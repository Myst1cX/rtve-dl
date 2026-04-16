// ==UserScript==
// @name         RTVE Video and Subtitle Downloader
// @namespace    https://github.com/Myst1cX/rtve-video-dl
// @version      1.0
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

    // ── Helpers ──────────────────────────────────────────────────────────────

    function copyToClipboard(text) {
        if (typeof GM_setClipboard !== 'undefined') {
            GM_setClipboard(text);
            return true;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(() => {});
            return true;
        }
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            return true;
        } catch (_) {
            return false;
        }
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

        const widget = document.createElement('div');
        widget.id = WIDGET_ID;
        widget.style.cssText = [
            'position:fixed',
            'bottom:24px',
            'right:24px',
            'z-index:2147483647',
            'width:324px',
            'background:#0d1b36',
            'border:1px solid #1a3055',
            'border-radius:10px',
            'box-shadow:0 8px 32px rgba(0,0,0,.75),0 1px 0 rgba(255,255,255,.04) inset',
            'font-family:Arial,sans-serif',
            'font-size:13px',
            'color:#dde4f0',
            'user-select:none',
        ].join(';');

        widget.innerHTML = `
<div id="rtve-dl-header" style="
    display:flex;justify-content:space-between;align-items:center;
    padding:8px 11px;background:#0c2142;border-radius:10px 10px 0 0;cursor:move;
    border-bottom:1px solid #1a3a60;">
  <span style="color:#e94560;font-weight:bold;font-size:13px;letter-spacing:.3px;">📥 RTVE Downloader</span>
  <div style="display:flex;gap:2px;">
    <button id="rtve-dl-min" title="Minimise"
      style="background:none;border:none;color:#7a9bbf;cursor:pointer;font-size:17px;line-height:1;padding:0 5px;transition:color .15s;">−</button>
    <button id="rtve-dl-close" title="Close"
      style="background:none;border:none;color:#7a9bbf;cursor:pointer;font-size:17px;line-height:1;padding:0 5px;transition:color .15s;">×</button>
  </div>
</div>
<div id="rtve-dl-body" style="padding:10px 10px 12px;">
  <div style="background:#091528;border-radius:6px;padding:4px;border:1px solid #1a3055;">
    <iframe
      width="304" height="46"
      src="//www.descargavideos.tv/form.php?l=300&t=f2&c=negro"
      name="form_dv"
      allowtransparency="true"
      frameborder="0"
      scrolling="no"
      style="display:block;border:0;">
    </iframe>
  </div>
  <div style="margin-top:10px;border-top:1px solid #1a3055;padding-top:9px;">
    <div style="color:#6a85aa;font-size:11px;margin-bottom:5px;letter-spacing:.2px;">
      Current video page URL — paste into the widget above:
    </div>
    <div style="display:flex;gap:5px;">
      <input id="rtve-dl-url-input" type="text" readonly
        style="flex:1;min-width:0;background:#091528;border:1px solid #1a3055;
               color:#b8ccdd;padding:5px 8px;border-radius:5px;font-size:11px;outline:none;" />
      <button id="rtve-dl-copy"
        style="background:#e94560;border:none;color:#fff;padding:5px 10px;
               border-radius:5px;cursor:pointer;font-size:11px;white-space:nowrap;
               transition:background .2s;font-weight:600;letter-spacing:.2px;">Copy</button>
    </div>
  </div>
</div>`;

        document.body.appendChild(widget);

        updateUrlField();

        // Minimise / expand
        let minimised = false;
        document.getElementById('rtve-dl-min').addEventListener('click', () => {
            minimised = !minimised;
            document.getElementById('rtve-dl-body').style.display = minimised ? 'none' : '';
            document.getElementById('rtve-dl-min').textContent = minimised ? '+' : '−';
        });

        // Close
        document.getElementById('rtve-dl-close').addEventListener('click', () => {
            widget.remove();
        });

        // Copy button
        document.getElementById('rtve-dl-copy').addEventListener('click', () => {
            const url = document.getElementById('rtve-dl-url-input').value;
            copyToClipboard(url);
            const btn = document.getElementById('rtve-dl-copy');
            if (!btn) return;
            btn.textContent = '✓ Copied';
            btn.style.background = '#28a745';
            setTimeout(() => {
                if (document.getElementById('rtve-dl-copy')) {
                    btn.textContent = 'Copy';
                    btn.style.background = '#e94560';
                }
            }, 2000);
        });

        // Drag
        makeDraggable(widget, document.getElementById('rtve-dl-header'));

        // Auto-copy the URL to clipboard so the user can paste immediately
        const url = document.getElementById('rtve-dl-url-input').value;
        copyToClipboard(url);
    }

    function makeDraggable(el, handle) {
        let dragging = false, ox = 0, oy = 0;

        handle.addEventListener('mousedown', (e) => {
            dragging = true;
            const r = el.getBoundingClientRect();
            // Switch from bottom/right anchoring to top/left so movement is natural
            el.style.bottom = 'auto';
            el.style.right = 'auto';
            el.style.left = r.left + 'px';
            el.style.top = r.top + 'px';
            ox = e.clientX - r.left;
            oy = e.clientY - r.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            el.style.left = (e.clientX - ox) + 'px';
            el.style.top = (e.clientY - oy) + 'px';
        });

        document.addEventListener('mouseup', () => { dragging = false; });
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
    const domObserver = new MutationObserver(attachVideoListeners);
    domObserver.observe(document.documentElement, { childList: true, subtree: true });

    // Small delay to let the SPA finish updating the URL before we read it
    const SPA_NAV_DELAY = 300;

    // Intercept history.pushState / replaceState to update the URL field when
    // the user navigates within the SPA
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
