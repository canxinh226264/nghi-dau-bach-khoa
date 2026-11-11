/* Bộ icon nét (24×24, stroke) dùng chung. */
window.ICONS = (function () {
  'use strict';
  const P = {
    search:   '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    moon:     '<path d="M20.5 13.4A8.5 8.5 0 1 1 10.6 3.5a6.6 6.6 0 0 0 9.9 9.9z"/>',
    chat:     '<path d="M21 14.5a2 2 0 0 1-2 2H8l-5 4.5V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 12.5h5"/>',
    walk:     '<circle cx="13.5" cy="4" r="2"/><path d="m9.5 21 2.6-6.2 2.9 2.7V21"/><path d="M7 11.5 9.6 8.4l4.1.6 2 3.3 2.8 1"/><path d="m9.6 8.4-.9 5.4 3.4 1"/>',
    laptop:   '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9"/><path d="M2.5 19.5h19L20 16H4z"/>',
    food:     '<path d="M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zm0 0v7"/>',
    cup:      '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
    soda:     '<path d="m6 8 1.75 12.28A2 2 0 0 0 9.73 22h4.54a2 2 0 0 0 1.98-1.72L18 8"/><path d="M5 8h14"/><path d="M7 15a6.5 6.5 0 0 1 5 0 6.5 6.5 0 0 0 5 0"/><path d="m12 8 1-6h2"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    book:     '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    tree:     '<path d="M8 19a4 4 0 0 1-2.24-7.32A3.5 3.5 0 0 1 9 6.03V6a3 3 0 1 1 6 0v.04a3.5 3.5 0 0 1 3.24 5.65A4 4 0 0 1 16 19z"/><path d="M12 19v3"/>',
    sun:      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    bag:      '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    mall:     '<path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/><path d="M9 10h6"/>',
    bed:      '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
    sparkle:  '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15v4M17 17h4"/>',
    nav:      '<path d="M3 11 22 2l-9 19-2-8z"/>',
    locate:   '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    pin:      '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    tap:      '<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10"/><path d="M12 10V8.5a1.5 1.5 0 0 1 3 0V11"/><path d="M15 10.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-.6a6 6 0 0 1-4.6-2.2L3.4 16.6a1.6 1.6 0 0 1 2.3-2.2L9 17V11"/>',
    back:     '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    x:        '<path d="M18 6 6 18M6 6l12 12"/>',
    plus:     '<path d="M12 5v14M5 12h14"/>',
    minus:    '<path d="M5 12h14"/>',
    chev:     '<path d="m6 9 6 6 6-6"/>',
    clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    bulb:     '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
    home:     '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    check:    '<path d="M20 6 9 17l-5-5"/>',
    collapse: '<path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="m14 10 7-7"/><path d="m3 21 7-7"/>',
    warn:     '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    route:    '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    door:     '<path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.6v16.2a1 1 0 0 1-1.2 1L5 20V5.6a2 2 0 0 1 1.5-1.9l4-1A2 2 0 0 1 13 4.6z"/>',
  };
  function svg(name, cls) {
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }
  return { svg, has: (n) => n in P };
})();
