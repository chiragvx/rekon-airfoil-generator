let currentSeries = 4;
window.lastCoords = { upper: [], lower: [] };

function getNumPoints() {
    const v = parseInt(document.getElementById('pointsInput').value, 10);
    return Math.min(500, Math.max(20, isNaN(v) ? 80 : v));
}

function syncPointsUI() {
    const n = getNumPoints();
    document.getElementById('pointsSlider').value = n;
    document.getElementById('pointsInput').value = n;
}

// ---- NACA 4-digit ----
function naca4digit(code, numPoints) {
    const m = parseInt(code[0], 10) / 100;
    const p = parseInt(code[1], 10) / 10;
    const t = parseInt(code.slice(2), 10) / 100;
    const n = numPoints;
    const coords = { upper: [], lower: [] };
    for (let i = 0; i <= n; i++) {
        const x = i / n;
        const yt = (t / 0.2) * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x * x + 0.2843 * x * x * x - 0.1015 * x * x * x * x);
        let yc, dyc;
        if (x < p && p > 0) {
            yc = (m / (p * p)) * (2 * p * x - x * x);
            dyc = (m / (p * p)) * (2 * p - 2 * x);
        } else {
            yc = (m / ((1 - p) * (1 - p))) * ((1 - 2 * p) + 2 * p * x - x * x);
            dyc = (m / ((1 - p) * (1 - p))) * (2 * p - 2 * x);
        }
        const th = Math.atan2(dyc, 1);
        coords.upper.push([x - yt * Math.sin(th), yc + yt * Math.cos(th)]);
        coords.lower.push([x + yt * Math.sin(th), yc - yt * Math.cos(th)]);
    }
    return coords;
}

// ---- NACA 5-digit (standard NACA TR 824 / Abbott & von Doenhoff) ----
function naca5digit(code, numPoints) {
    const L = parseInt(code[0], 10);
    const P = parseInt(code[1], 10);
    const Q = parseInt(code[2], 10);
    const t = parseInt(code.slice(3), 10) / 100;
    const designCL = 0.15 * L;
    const xmc = 0.05 * P;

    let r;
    if (Q === 0) {
        // Standard series: r from x_mc = r*(1 - sqrt(r/3)), solve by iteration
        r = 0.1;
        for (let it = 0; it < 30; it++) {
            const rNext = xmc + r * Math.sqrt(r / 3);
            if (Math.abs(rNext - r) < 1e-10) break;
            r = rNext;
        }
    } else {
        // Reflex series: use tabulated r for common camber (23112 -> 0.217)
        r = xmc <= 0.1 ? 0.13 : xmc <= 0.15 ? 0.217 : 0.25;
    }

    const sr = Math.sqrt(r - r * r);
    const N = sr > 1e-12
        ? (3 * r - 7 * r * r + 8 * r * r * r - 4 * r * r * r * r) / sr - (3 / 2) * (1 - 2 * r) * (Math.PI / 2 - Math.asin(Math.max(-1, Math.min(1, 1 - 2 * r))))
        : 1;
    const k1 = N > 1e-12 ? (6 * designCL) / N : 0;

    const n = numPoints;
    const coords = { upper: [], lower: [] };
    for (let i = 0; i <= n; i++) {
        const x = i / n;
        const yt = (t / 0.2) * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x * x + 0.2843 * x * x * x - 0.1015 * x * x * x * x);
        let yc, dyc;
        if (Q === 0) {
            if (x < r) {
                yc = (k1 / 6) * (x * x * x - 3 * r * x * x + r * r * (3 - r) * x);
                dyc = (k1 / 6) * (3 * x * x - 6 * r * x + r * r * (3 - r));
            } else {
                yc = (k1 / 6) * r * r * r * (1 - x);
                dyc = -(k1 / 6) * r * r * r;
            }
        } else {
            const k21 = (3 * (r - xmc) * (r - xmc) - r * r * r) / ((1 - r) * (1 - r) * (1 - r));
            if (x < r) {
                yc = (k1 / 6) * ((x - r) * (x - r) * (x - r) - k21 * (1 - r) * (1 - r) * (1 - r) * x - r * r * r * x + r * r * r);
                dyc = (k1 / 6) * (3 * (x - r) * (x - r) - k21 * (1 - r) * (1 - r) * (1 - r) - r * r * r);
            } else {
                yc = (k1 / 6) * (k21 * (x - r) * (x - r) * (x - r) - k21 * (1 - r) * (1 - r) * (1 - r) * x - r * r * r * x + r * r * r);
                dyc = (k1 / 6) * (3 * k21 * (x - r) * (x - r) - k21 * (1 - r) * (1 - r) * (1 - r) - r * r * r);
            }
        }
        const th = Math.atan2(dyc, 1);
        coords.upper.push([x - yt * Math.sin(th), yc + yt * Math.cos(th)]);
        coords.lower.push([x + yt * Math.sin(th), yc - yt * Math.cos(th)]);
    }
    return coords;
}

// Tabulated Basic Thickness for NACA 6-series families (10% thickness base)
const SIX_BASIC_THICKNESS = {
    '63': [[0, 0], [0.5, 0.767], [0.75, 0.927], [1.25, 1.168], [2.5, 1.597], [5, 2.223], [7.5, 2.703], [10, 3.102], [15, 3.738], [20, 4.215], [25, 4.567], [30, 4.804], [35, 4.939], [40, 4.981], [45, 4.909], [50, 4.704], [55, 4.385], [60, 3.991], [65, 3.518], [70, 2.997], [75, 2.457], [80, 1.912], [85, 1.376], [90, 0.860], [95, 0.380], [100, 0]],
    '64': [[0, 0], [0.5, 0.754], [0.75, 0.914], [1.25, 1.155], [2.5, 1.593], [5, 2.235], [7.5, 2.730], [10, 3.141], [15, 3.805], [20, 4.311], [25, 4.686], [30, 4.933], [35, 5.061], [40, 5.074], [45, 4.949], [50, 4.671], [55, 4.269], [60, 3.793], [65, 3.276], [70, 2.735], [75, 2.181], [80, 1.637], [85, 1.114], [90, 0.632], [95, 0.228], [100, 0]],
    '65': [[0, 0], [0.5, 0.741], [0.75, 0.901], [1.25, 1.144], [2.5, 1.593], [5, 2.253], [7.5, 2.766], [10, 3.195], [15, 3.896], [20, 4.439], [25, 4.846], [30, 5.122], [35, 5.275], [40, 5.289], [45, 5.132], [50, 4.782], [55, 4.296], [60, 3.732], [65, 3.123], [70, 2.502], [75, 1.892], [80, 1.319], [85, 0.820], [90, 0.414], [95, 0.128], [100, 0]],
    '66': [[0, 0], [0.5, 0.728], [0.75, 0.888], [1.25, 1.134], [2.5, 1.596], [5, 2.274], [7.5, 2.804], [10, 3.253], [15, 4.001], [20, 4.582], [25, 5.031], [30, 5.347], [35, 5.530], [40, 5.549], [45, 5.352], [50, 4.881], [55, 4.271], [60, 3.559], [65, 2.812], [70, 2.063], [75, 1.353], [80, 0.747], [85, 0.312], [90, 0.041], [95, 0], [100, 0]]
};

function parse6series(code) {
    let raw = code.replace(/\s/g, '').toUpperCase();
    if (raw[0] !== '6') return null;
    let family, designCl, bucket, t, is6A = false;
    if (raw.includes('A')) is6A = true;
    let bucketMatch = raw.match(/\((\d+)\)/);
    bucket = bucketMatch ? parseInt(bucketMatch[1], 10) / 10 : 0.2;
    let working = raw.replace(/\(\d+\)/, '');
    let dashIdx = working.indexOf('-');
    if (dashIdx === -1) return null;
    family = working.substring(1, dashIdx).substring(0, 1);
    let suffix = working.substring(dashIdx + 1);
    designCl = parseInt(suffix[0], 10) / 10;
    t = parseInt(suffix.substring(1), 10) / 100;
    return { family, designCl, t, is6A };
}

function nacaMeanLine6(x, cli) {
    if (cli === 0) return { yc: 0, dyc: 0 };
    const eps = 1e-10;
    const xs = Math.max(eps, Math.min(1 - eps, x));
    const factor = -(cli / (4 * Math.PI));
    const yc = factor * (xs * Math.log(xs) + (1 - xs) * Math.log(1 - xs));
    const dyc = factor * (Math.log(xs) - Math.log(1 - xs));
    return { yc, dyc };
}

function interpolateThick(x, fam) {
    const table = SIX_BASIC_THICKNESS[fam] || SIX_BASIC_THICKNESS['64'];
    const xPct = x * 100;
    if (xPct <= 0) return 0;
    if (xPct >= 100) return 0;
    for (let i = 0; i < table.length - 1; i++) {
        const p1 = table[i], p2 = table[i + 1];
        if (xPct >= p1[0] && xPct <= p2[0]) {
            const ratio = (xPct - p1[0]) / (p2[0] - p1[0]);
            return (p1[1] + ratio * (p2[1] - p1[1])) / 100;
        }
    }
    return 0;
}

function naca6digit(code, numPoints) {
    const p = parse6series(code);
    if (!p) return null;
    const { family, designCl, t } = p;
    const n = numPoints;
    const coords = { upper: [], lower: [] };
    const scaleFactor = t / 0.1;
    for (let i = 0; i <= n; i++) {
        const x = 0.5 * (1 - Math.cos((Math.PI * i) / n));
        let yt = interpolateThick(x, '6' + family) * scaleFactor;
        const { yc, dyc } = nacaMeanLine6(x, designCl);
        const th = Math.atan(dyc);
        if (i === 0) {
            coords.upper.push([0, 0]);
            coords.lower.push([0, 0]);
        } else if (i === n) {
            coords.upper.push([1, 0]);
            coords.lower.push([1, 0]);
        } else {
            coords.upper.push([x - yt * Math.sin(th), yc + yt * Math.cos(th)]);
            coords.lower.push([x + yt * Math.sin(th), yc - yt * Math.cos(th)]);
        }
    }
    return coords;
}

function generate() {
    let coords;
    const numPoints = getNumPoints();
    syncPointsUI();
    if (currentSeries === 4) {
        const v = document.getElementById('naca4').value.replace(/\s/g, '');
        if (v.length !== 4 || isNaN(parseInt(v, 10))) { alert('NACA 4-digit: use 4 digits (e.g. 2412)'); return; }
        coords = naca4digit(v, numPoints);
    } else if (currentSeries === 5) {
        const v = document.getElementById('naca5').value.replace(/\s/g, '');
        if (v.length !== 5 || isNaN(parseInt(v, 10))) { alert('NACA 5-digit: use 5 digits (e.g. 23012)'); return; }
        coords = naca5digit(v, numPoints);
    } else {
        const raw = document.getElementById('naca6').value;
        coords = naca6digit(raw, numPoints);
        if (!coords) { alert('NACA 6-series: use 63, 64, 65, 66, 67 or 63A, 64A, 65A. E.g. 65-215, 65(2)-215, 63A-412'); return; }
    }
    window.lastCoords = coords;
    window.drawView2d(coords);
    if (document.getElementById('view3dWrap') && !document.getElementById('view3dWrap').classList.contains('hidden')) {
        if (window.initView3d) window.initView3d(coords);
    }
}

window.drawView2d = function (coords) {
    const isLight = document.body.classList.contains('light-mode');
    const canvas = document.getElementById('previewCanvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height;
    const pad = 40;
    const pts = [...coords.upper, ...[...coords.lower].reverse()];
    let minX = 1, maxX = 0, minY = 1, maxY = -1;
    pts.forEach(([x, y]) => {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    });
    const rangeX = maxX - minX || 1, rangeY = Math.max(maxY - minY, 0.1);
    const scale = Math.min((w - 2 * pad) / rangeX, (h - 2 * pad) / rangeY);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const tx = w / 2 - cx * scale, ty = h / 2 + cy * scale;

    ctx.fillStyle = isLight ? '#f8fafc' : '#0d0d0d';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = isLight ? '#0366d6' : '#ff3b1d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const [fx, fy] = pts[0];
    ctx.moveTo(fx * scale + tx, h - (fy * scale + ty));
    for (let i = 1; i < pts.length; i++) {
        const [x, y] = pts[i];
        ctx.lineTo(x * scale + tx, h - (y * scale + ty));
    }
    ctx.closePath();
    ctx.stroke();
}

function getAirfoilName() {
    if (currentSeries === 4) return 'NACA ' + document.getElementById('naca4').value.trim();
    if (currentSeries === 5) return 'NACA ' + document.getElementById('naca5').value.trim();
    return 'NACA ' + document.getElementById('naca6').value.trim().replace(/\s/g, ' ');
}

function getAirfoilFilename() {
    const name = getAirfoilName();
    return name.replace(/\s+/g, '_').replace(/[^\w\-_.]/g, '') || 'airfoil';
}

function exportDat() {
    const { upper, lower } = window.lastCoords;
    const fmt = document.getElementById('datFormat').value;
    let s = '';
    if (fmt === 'original') {
        s += getAirfoilName() + '\n';
        const upperTeToLe = [...upper].reverse();
        const lowerLeToTe = lower.slice(1);
        upperTeToLe.forEach(([x, y]) => { s += `${x.toFixed(4)}     ${y.toFixed(5)}\n`; });
        lowerLeToTe.forEach(([x, y]) => { s += `${x.toFixed(4)}     ${y.toFixed(5)}\n`; });
    } else if (fmt === 'selig') {
        s += getAirfoilName() + '\n';
        upper.forEach(([x, y]) => { s += `${x.toFixed(6)} ${y.toFixed(6)}\n`; });
        lower.forEach(([x, y]) => { s += `${x.toFixed(6)} ${y.toFixed(6)}\n`; });
    } else if (fmt === 'lednicer') {
        s += 'Upper surface\n';
        upper.forEach(([x, y]) => { s += `${x.toFixed(6)} ${y.toFixed(6)}\n`; });
        s += 'Lower surface\n';
        lower.forEach(([x, y]) => { s += `${x.toFixed(6)} ${y.toFixed(6)}\n`; });
    }
    download(getAirfoilFilename() + '.dat', s, 'text/plain');
}

function exportCsv() {
    const { upper, lower } = window.lastCoords;
    let s = 'x,y,side\n';
    upper.forEach(([x, y]) => { s += `${x.toFixed(6)},${y.toFixed(6)},upper\n`; });
    lower.forEach(([x, y]) => { s += `${x.toFixed(6)},${y.toFixed(6)},lower\n`; });
    download(getAirfoilFilename() + '.csv', s, 'text/csv');
}

function exportSvg() {
    const { upper, lower } = window.lastCoords;
    const pts = [...upper, ...[...lower].reverse()];
    let minX = 1, maxX = 0, minY = 1, maxY = -1;
    pts.forEach(([x, y]) => {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    });
    const rangeX = maxX - minX || 1, rangeY = Math.max(maxY - minY, 0.1);
    const w = 800, h = 400, pad = 40;
    const scale = Math.min((w - 2 * pad) / rangeX, (h - 2 * pad) / rangeY);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const tx = w / 2 - cx * scale, ty = h / 2 + cy * scale;
    const path = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${(x * scale + tx).toFixed(2)} ${(h - (y * scale + ty)).toFixed(2)}`).join(' ') + ' Z';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><path fill="none" stroke="#58a6ff" stroke-width="2" d="${path}"/></svg>`;
    download(getAirfoilFilename() + '.svg', svg, 'image/svg+xml');
}

function exportPng() {
    const canvas = document.getElementById('previewCanvas');
    const fname = getAirfoilFilename() + '.png';
    canvas.toBlob(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fname;
        a.click();
        URL.revokeObjectURL(a.href);
    }, 'image/png');
}

function download(name, content, type) {
    const a = document.createElement('a');
    a.href = 'data:' + type + ';charset=utf-8,' + encodeURIComponent(content);
    a.download = name;
    a.click();
}

function generatePresetPreview(container) {
    const series = parseInt(container.dataset.series, 10);
    const value = container.dataset.value;
    let coords;
    const numPoints = 60;
    if (series === 4) coords = naca4digit(value, numPoints);
    else if (series === 5) coords = naca5digit(value, numPoints);
    else coords = naca6digit(value, numPoints);

    if (!coords) return;

    const isLight = document.body.classList.contains('light-mode');
    const pts = [...coords.upper, ...[...coords.lower].reverse()];
    let minX = 1, maxX = 0, minY = 1, maxY = -1;
    pts.forEach(([x, y]) => {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    });
    const rangeX = maxX - minX || 1, rangeY = Math.max(maxY - minY, 0.1);
    const w = 300, h = 80, pad = 15;
    const scale = Math.min((w - 2 * pad) / rangeX, (h - 2 * pad) / rangeY);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const tx = w / 2 - cx * scale, ty = h / 2 + cy * scale;

    const pathData = pts.map(([x, y], i) =>
        `${i === 0 ? 'M' : 'L'} ${(x * scale + tx).toFixed(2)} ${(h - (y * scale + ty)).toFixed(2)}`
    ).join(' ') + ' Z';

    const strokeColor = isLight ? '#0366d6' : '#ff3b1d';
    const gridColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';

    container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="grid" width="${w / 10}" height="${h / 4}" patternUnits="userSpaceOnUse">
          <path d="M ${w / 10} 0 L 0 0 0 ${h / 4}" fill="none" stroke="${gridColor}" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      <path d="${pathData}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linejoin="round" />
      <circle cx="${pts[0][0] * scale + tx}" cy="${h - (pts[0][1] * scale + ty)}" r="2" fill="${strokeColor}" />
    </svg>
  `;
}

function drawAllPresetPreviews() {
    document.querySelectorAll('.preset-preview-svg').forEach(container => {
        generatePresetPreview(container);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.series-tabs button').forEach(btn => {
        btn.addEventListener('click', () => {
            currentSeries = parseInt(btn.dataset.series, 10);
            document.querySelectorAll('.series-tabs button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.series-params').forEach(p => p.classList.remove('active'));
            document.getElementById('params' + currentSeries).classList.add('active');
        });
    });

    document.getElementById('generateBtn').addEventListener('click', generate);
    document.getElementById('pointsSlider').addEventListener('input', () => {
        document.getElementById('pointsInput').value = document.getElementById('pointsSlider').value;
    });
    document.getElementById('pointsInput').addEventListener('input', () => { syncPointsUI(); });
    document.getElementById('pointsInput').addEventListener('change', () => { syncPointsUI(); });

    document.getElementById('view2dBtn').addEventListener('click', () => {
        if (window.switchTo2d) window.switchTo2d();
    });
    document.getElementById('view3dBtn').addEventListener('click', () => {
        if (window.switchTo3d && window.lastCoords.upper.length) window.switchTo3d(window.lastCoords);
    });
    document.getElementById('wireframeBtn').addEventListener('click', () => {
        if (window.toggleWireframe) window.toggleWireframe();
    });
    document.getElementById('solidBtn').addEventListener('click', () => {
        if (window.toggleSolid) window.toggleSolid();
    });

    document.querySelectorAll('.preset-item').forEach(item => {
        item.addEventListener('click', () => {
            const series = parseInt(item.dataset.series, 10);
            const value = item.dataset.value;
            currentSeries = series;
            document.querySelectorAll('.left-section .series-tabs button').forEach(b => b.classList.remove('active'));
            const tab = document.querySelector(`.left-section .series-tabs button[data-series="${series}"]`);
            if (tab) tab.classList.add('active');
            document.querySelectorAll('.series-params').forEach(p => p.classList.remove('active'));
            document.getElementById('params' + series).classList.add('active');
            if (series === 4) document.getElementById('naca4').value = value;
            else if (series === 5) document.getElementById('naca5').value = value;
            else document.getElementById('naca6').value = value;
            generate();
        });
    });

    document.querySelectorAll('.btn-export').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!window.lastCoords.upper.length) { alert('Generate an airfoil first'); return; }
            const fmt = btn.dataset.format;
            if (fmt === 'dat') exportDat();
            else if (fmt === 'csv') exportCsv();
            else if (fmt === 'svg') exportSvg();
            else if (fmt === 'png') exportPng();
        });
    });

    // Theme Toggle Logic
    const themeToggle = document.getElementById('themeToggle');
    const navLogo = document.getElementById('navLogo');
    const footerLogo = document.getElementById('footerLogo');

    function updateLogos(isLight) {
        const logoSrc = isLight ? 'assets/light.svg' : 'assets/dark.svg';
        if (navLogo) navLogo.src = logoSrc;
        if (footerLogo) footerLogo.src = logoSrc;
    }

    const savedTheme = localStorage.getItem('rekon-theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        updateLogos(true);
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('rekon-theme', isLight ? 'light' : 'dark');
        updateLogos(isLight);

        if (window.lastCoords.upper.length) window.drawView2d(window.lastCoords);
        drawAllPresetPreviews();
    });

    // Library Tab Switching Logic
    const libTabs = document.querySelectorAll('#libraryTabs button');
    const libGroups = document.querySelectorAll('.preset-group');

    libTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.group;
            libTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            libGroups.forEach(group => {
                group.style.display = group.classList.contains('lib-group-' + target) ? 'block' : 'none';
            });
        });
    });

    generate();
    setTimeout(drawAllPresetPreviews, 100);
    window.addEventListener('resize', drawAllPresetPreviews);
});
