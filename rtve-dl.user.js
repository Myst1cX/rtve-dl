// ==UserScript==
// @name         RTVE Video and Subtitle Downloader
// @namespace    https://github.com/Myst1cX/rtve-dl
// @version      1.1
// @description  A RTVE downloader powered by downloadvideos.tv. Displays the downloadvideos.tv widget on RTVE videos. Works with both HLS and encrypted video streams.
// @author       Myst1cX
// @match        https://www.rtve.es/*
// @run-at       document-idle
// @grant        none
// @homepageURL  https://github.com/Myst1cX/rtve-dl
// @supportURL   https://github.com/Myst1cX/rtve-dl/issues
// @updateURL    https://raw.githubusercontent.com/Myst1cX/rtve-subs-dl/main/rtve-dl.user.js
// @downloadURL  https://raw.githubusercontent.com/Myst1cX/rtve-subs-dl/main/rtve-dl.user.js
// ==/UserScript==

(function () {
    'use strict';

    // ── RTVE colour palette ──────────────────────────────────────────────────
    const C = {
        red:      '#E3002B',
        redDark:  '#B50023',
        white:    '#FFFFFF',
        dark:     '#1A1A1A',
        border:   '#CC0028',
        shadow:   'rgba(0,0,0,0.40)',
    };

    const STORAGE_KEY   = 'rtve-dl-widget-pos';
    const HIDDEN_KEY    = 'rtve-dl-widget-hidden';
    const WIDGET_WIDTH  = 324;
    const WIDGET_HEIGHT = 80;
    const MAX_Z_INDEX   = 2147483647;

    // ── Clamp helpers ─────────────────────────────────────────────────────────
    function clampX(x, w) {
        return Math.max(0, Math.min(window.innerWidth  - (w || WIDGET_WIDTH),  x));
    }
    function clampY(y, h) {
        return Math.max(0, Math.min(window.innerHeight - (h || WIDGET_HEIGHT), y));
    }

    // ── Inject ────────────────────────────────────────────────────────────────
    function inject() {

        // ── Widget container ─────────────────────────────────────────────
        const widget = document.createElement('div');
        widget.id = 'rtve-dl-widget';
        Object.assign(widget.style, {
            position:     'fixed',
            zIndex:       String(MAX_Z_INDEX),
            borderRadius: '6px',
            boxShadow:    `0 6px 20px ${C.shadow}`,
            overflow:     'hidden',
            border:       `2px solid ${C.border}`,
            background:   C.white,
            minWidth:     '320px',
            fontFamily:   'Arial, sans-serif',
        });

        // ── Drag handle / header ─────────────────────────────────────────
        const header = document.createElement('div');
        Object.assign(header.style, {
            background:     C.red,
            color:          C.white,
            padding:        '7px 10px',
            cursor:         'move',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            userSelect:     'none',
            fontSize:       '12px',
            fontWeight:     'bold',
            letterSpacing:  '0.4px',
            textTransform:  'uppercase',
        });

        const title = document.createElement('span');
        title.textContent = '▶ RTVE · Descargar Vídeo';

        // ── Close (×) button ─────────────────────────────────────────────
        const closeBtn = document.createElement('span');
        closeBtn.textContent = '✕';
        Object.assign(closeBtn.style, {
            cursor:       'pointer',
            fontSize:     '13px',
            lineHeight:   '1',
            padding:      '2px 5px',
            borderRadius: '3px',
            transition:   'background 0.15s',
        });
        closeBtn.title = 'Cerrar (se puede reabrir con el botón flotante)';
        closeBtn.addEventListener('mouseover', () => { closeBtn.style.background = C.redDark; });
        closeBtn.addEventListener('mouseout',  () => { closeBtn.style.background = 'transparent'; });
        closeBtn.addEventListener('click', () => {
            widget.style.display    = 'none';
            toggleBtn.style.display = 'flex';
            localStorage.setItem(HIDDEN_KEY, '1');
        });

        header.appendChild(title);
        header.appendChild(closeBtn);

        // ── Body – hosts the iframe ──────────────────────────────────────
        const body = document.createElement('div');
        Object.assign(body.style, {
            background:     C.white,
            padding:        '8px 10px',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
        });

        const iframe = document.createElement('iframe');
        iframe.src    = 'https://www.descargavideos.tv/form.php?l=300&t=f2&c=blanco';
        iframe.name   = 'form_dv';
        iframe.width  = '300';
        iframe.height = '46';
        iframe.setAttribute('allowtransparency', 'true');
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('scrolling', 'no');
        Object.assign(iframe.style, { display: 'block', border: 'none' });

        body.appendChild(iframe);
        widget.appendChild(header);
        widget.appendChild(body);

        // ── Restore saved position (or default to bottom-right) ──────────
        const savedPos = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (savedPos && savedPos.top != null && savedPos.left != null) {
            widget.style.top  = clampY(savedPos.top)  + 'px';
            widget.style.left = clampX(savedPos.left) + 'px';
        } else {
            widget.style.bottom = '24px';
            widget.style.right  = '24px';
        }

        if (localStorage.getItem(HIDDEN_KEY) === '1') {
            widget.style.display = 'none';
        }

        // ── Drag logic ───────────────────────────────────────────────────
        let dragging = false, ox = 0, oy = 0;

        header.addEventListener('mousedown', (e) => {
            if (e.target === closeBtn) return;
            dragging = true;
            const rect = widget.getBoundingClientRect();
            // Normalise from bottom/right to top/left before dragging
            widget.style.top    = rect.top  + 'px';
            widget.style.left   = rect.left + 'px';
            widget.style.bottom = 'auto';
            widget.style.right  = 'auto';
            ox = e.clientX - rect.left;
            oy = e.clientY - rect.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            widget.style.left = clampX(e.clientX - ox) + 'px';
            widget.style.top  = clampY(e.clientY - oy) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            const rect = widget.getBoundingClientRect();
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ top: rect.top, left: rect.left }));
        });

        // ── Toggle / reopen button ───────────────────────────────────────
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = '▶';
        toggleBtn.title = 'Descargar vídeo RTVE';
        Object.assign(toggleBtn.style, {
            position:       'fixed',
            bottom:         '24px',
            right:          '24px',
            zIndex:         String(MAX_Z_INDEX - 1),
            background:     C.red,
            color:          C.white,
            border:         'none',
            borderRadius:   '50%',
            width:          '42px',
            height:         '42px',
            fontSize:       '16px',
            cursor:         'pointer',
            boxShadow:      `0 4px 12px ${C.shadow}`,
            display:        localStorage.getItem(HIDDEN_KEY) === '1' ? 'flex' : 'none',
            alignItems:     'center',
            justifyContent: 'center',
            transition:     'background 0.15s',
        });
        toggleBtn.addEventListener('mouseover', () => { toggleBtn.style.background = C.redDark; });
        toggleBtn.addEventListener('mouseout',  () => { toggleBtn.style.background = C.red; });
        toggleBtn.addEventListener('click', () => {
            widget.style.display    = 'block';
            toggleBtn.style.display = 'none';
            localStorage.removeItem(HIDDEN_KEY);
        });

        document.body.appendChild(widget);
        document.body.appendChild(toggleBtn);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }
})();
