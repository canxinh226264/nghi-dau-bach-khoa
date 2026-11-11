/* Dữ liệu địa điểm quanh Đại học Bách khoa Hà Nội.
 * Tọa độ lấy từ OpenStreetMap (© OpenStreetMap contributors, ODbL), tra cứu 11/2026.
 * Giờ mở cửa chỉ ghi khi OSM có dữ liệu; còn lại để trống.
 */
window.HUST_DATA = (function () {
  'use strict';

  const needs = [
    { id: 'quiet',  label: 'Yên tĩnh',     hint: 'Ngồi yên, chợp mắt',      color: '#4263eb', icon: 'moon' },
    { id: 'social', label: 'Giao tiếp',    hint: 'Ngồi cùng bạn bè',        color: '#e8590c', icon: 'chat' },
    { id: 'move',   label: 'Đi lại',       hint: 'Đi dạo, vận động nhẹ',    color: '#2b8a3e', icon: 'walk' },
    { id: 'work',   label: 'Làm việc nhỏ', hint: 'Mở laptop, ôn bài',       color: '#7048e8', icon: 'laptop' },
    { id: 'food',   label: 'Có đồ ăn',     hint: 'Ăn nhẹ, ăn trưa',         color: '#d6336c', icon: 'food' },
    { id: 'drink',  label: 'Đồ uống',      hint: 'Cà phê, trà, nước',       color: '#1098ad', icon: 'cup' },
  ];

  // minRest: số phút nghỉ tối thiểu để chuyến đi "đáng" (vd. bơi cần >= 40').
  const kinds = {
    hall:    { label: 'Giảng đường / tòa học', icon: 'building', color: '#52607a', minRest: 3 },
    library: { label: 'Thư viện',              icon: 'book',     color: '#4263eb', minRest: 10 },
    hub:     { label: 'Không gian sáng tạo',   icon: 'sparkle',  color: '#7048e8', minRest: 10 },
    outdoor: { label: 'Khoảng sân / ghế đá',   icon: 'sun',      color: '#2f9e44', minRest: 5 },
    park:    { label: 'Công viên / hồ',        icon: 'tree',     color: '#2b8a3e', minRest: 15 },
    sport:   { label: 'Thể thao',              icon: 'activity', color: '#0ca678', minRest: 15 },
    cafe:    { label: 'Quán cà phê',           icon: 'cup',      color: '#a0522d', minRest: 10 },
    tea:     { label: 'Trà sữa / kem',         icon: 'soda',     color: '#1098ad', minRest: 5 },
    canteen: { label: 'Nhà ăn / căng tin',     icon: 'food',     color: '#d6336c', minRest: 15 },
    food:    { label: 'Quán ăn',               icon: 'food',     color: '#e64980', minRest: 15 },
    store:   { label: 'Cửa hàng tiện lợi',     icon: 'bag',      color: '#e67700', minRest: 2 },
    vending: { label: 'Máy bán nước',          icon: 'soda',     color: '#1c7ed6', minRest: 1 },
    mall:    { label: 'Trung tâm thương mại',  icon: 'mall',     color: '#ae3ec9', minRest: 25 },
    dorm:    { label: 'Ký túc xá',             icon: 'bed',      color: '#c8102e', minRest: 10 },
    here:    { label: 'Ngay tại chỗ',          icon: 'pin',      color: '#1a73e8', minRest: 0 },
  };

  const hallDesc = (n) =>
    `Nghỉ ở sảnh, hành lang hoặc phòng học trống của ${n}. Hiện chưa có dữ liệu từng phòng nên chỉ gợi ý theo tòa.`;

  const H = (id, name, lat, lng, extra) => Object.assign({
    id, name, short: name, kind: 'hall', lat, lng, needs: ['quiet', 'work'], area: 'campus', desc: hallDesc(name),
  }, extra || {});

  const places = [
    // ── Giảng đường khu D ─────────────────────────────
    H('D2',   'Tòa D2',   21.004855, 105.842555),
    H('D3',   'Tòa D3',   21.004773, 105.845011, { tip: 'Có máy bán nước tự động ngay sảnh D3.' }),
    H('D3-5', 'Khối nối D3-5', 21.004515, 105.845281, { needs: ['social', 'work'], desc: 'Khối nối giữa D3 và D5, sảnh rộng, thường đông sinh viên ngồi chờ giữa giờ. Chưa có dữ liệu từng phòng.' }),
    H('D4',   'Tòa D4',   21.004245, 105.842073),
    H('D5',   'Tòa D5',   21.004359, 105.844948),
    H('D6',   'Tòa D6',   21.004298, 105.842688, { tip: 'Có dãy ghế đá giữa D6 và D8 nếu muốn ra ngoài trời.' }),
    H('D7',   'Tòa D7',   21.004089, 105.844910),
    H('D8',   'Tòa D8',   21.003955, 105.842668, { tip: 'Tòa cao 11 tầng — tầng cao thường vắng hơn.' }),
    H('D9',   'Tòa D9',   21.003817, 105.844134, { tip: 'Có vòi nước uống và máy bán nước giữa D7 và D9.' }),
    // ── Giảng đường khu C ─────────────────────────────
    H('C1',   'Tòa C1',   21.007050, 105.843141, { tip: 'Ngay cạnh Quảng trường C1 và đài phun nước.' }),
    H('C2',   'Tòa C2',   21.006401, 105.842318),
    H('C3',   'Tòa C3',   21.006566, 105.843989),
    H('C4',   'Tòa C4',   21.006177, 105.844045),
    H('C5',   'Tòa C5',   21.005772, 105.844036),
    H('C6',   'Tòa C6',   21.006188, 105.845022),
    H('C7',   'Tòa C7',   21.005589, 105.845040),
    H('C9',   'Tòa C9',   21.005826, 105.842213),
    H('C10',  'Tòa C10',  21.005451, 105.844064),
    // ── Tòa khác ─────────────────────────────────────
    H('B1',     'Nhà B1',   21.004496, 105.846619, { desc: hallDesc('Nhà B1 (Trường CNTT & Truyền thông)') }),
    H('TC',     'Nhà TC',   21.002710, 105.846508),
    H('HiTech', 'Tòa HiTech', 21.006928, 105.844148),

    // ── Thư viện & không gian làm việc ───────────────
    { id: 'lib-tqb', name: 'Thư viện Tạ Quang Bửu', short: 'Thư viện TQB', kind: 'library', lat: 21.004437, lng: 105.844135,
      needs: ['quiet', 'work'], area: 'campus',
      desc: 'Thư viện trung tâm 10 tầng của trường, nhiều khu tự học yên tĩnh — hợp để chợp mắt nhẹ, đọc tài liệu hoặc làm bài.',
      tip: 'Nhớ mang thẻ sinh viên để qua cổng thư viện.' },
    { id: 'digital-hub', name: 'HUST Digital Hub', short: 'Digital Hub', kind: 'hub', lat: 21.004709, lng: 105.843295,
      needs: ['work', 'social'], area: 'campus',
      desc: 'Không gian số cạnh Trung tâm Sáng tạo & Khởi nghiệp sinh viên, gần Hồ Tiền — hợp để làm việc nhóm nhỏ.' },
    { id: 'lib-hn', name: 'Thư viện Hà Nội', short: 'Thư viện HN', kind: 'library', lat: 21.021772, lng: 105.850725,
      needs: ['quiet', 'work'], area: 'nearby', minRest: 20,
      desc: 'Thư viện công cộng của thành phố trên phố Trần Hưng Đạo, có phòng đọc yên tĩnh.' },

    // ── Ngoài trời trong khuôn viên ──────────────────
    { id: 'ho-tien', name: 'Hồ Tiền', short: 'Hồ Tiền', kind: 'outdoor', lat: 21.004103, lng: 105.843355,
      needs: ['quiet', 'move'], area: 'campus',
      desc: 'Hồ nước giữa khuôn viên, nhiều bóng cây và ghế đá quanh hồ — hợp để thả lỏng hoặc đi dạo một vòng.' },
    { id: 'qt-c1', name: 'Quảng trường C1 & đài phun nước', short: 'Quảng trường C1', kind: 'outdoor', lat: 21.006242, lng: 105.843130,
      needs: ['social', 'move'], area: 'campus',
      desc: 'Quảng trường trước tòa C1 với đài phun nước và rất nhiều dãy ghế đá, hay có sinh viên ngồi tụ tập.' },
    { id: 'qt-tqb', name: 'Quảng trường Tạ Quang Bửu', short: 'QT Tạ Quang Bửu', kind: 'outdoor', lat: 21.004748, lng: 105.844145,
      needs: ['social', 'move'], area: 'campus',
      desc: 'Khoảng sân rộng trước thư viện, có ghế ngồi — điểm hẹn quen thuộc giữa các tòa D.' },
    { id: 'qt-nga5', name: 'Quảng trường ngã 5', short: 'Ngã 5', kind: 'outdoor', lat: 21.005453, lng: 105.843219,
      needs: ['social', 'quiet'], area: 'campus',
      desc: 'Khoảng sân giữa khu C và khu D, có hàng ghế đá dưới tán cây.' },
    { id: 'qt-tdn', name: 'Quảng trường Trần Đại Nghĩa', short: 'QT Trần Đại Nghĩa', kind: 'outdoor', lat: 21.006410, lng: 105.842096,
      needs: ['move', 'quiet'], area: 'campus',
      desc: 'Quảng trường phía tây khu C, thoáng và ít người hơn quảng trường C1.' },
    { id: 'ghe-d6d8', name: 'Ghế đá giữa D6 – D8', short: 'Ghế đá D6–D8', kind: 'outdoor', lat: 21.004150, lng: 105.842550,
      needs: ['quiet'], area: 'campus',
      desc: 'Cụm ghế đá giữa hai tòa D6 và D8, khá yên tĩnh khi đang trong giờ học.' },

    // ── Thể thao ─────────────────────────────────────
    { id: 'svd', name: 'Sân vận động & đường chạy Bách Khoa', short: 'Sân vận động', kind: 'sport', lat: 21.002199, lng: 105.847863,
      needs: ['move'], area: 'campus', minRest: 10,
      desc: 'Đường chạy và sân bóng phía nam trường — đi bộ vài vòng cho tỉnh táo.' },
    { id: 'nha-thi-dau', name: 'Nhà thi đấu Bách Khoa', short: 'Nhà thi đấu', kind: 'sport', lat: 21.003204, lng: 105.846825,
      needs: ['move', 'social'], area: 'campus',
      desc: 'Nhà thi đấu trong nhà (ngõ 40 Tạ Quang Bửu), hợp để vận động nhẹ cùng bạn bè.' },
    { id: 'be-boi', name: 'Bể bơi Bách Khoa', short: 'Bể bơi', kind: 'sport', lat: 21.003468, lng: 105.847212,
      needs: ['move'], area: 'campus', minRest: 40,
      desc: 'Bể bơi của trường — chỉ đáng đi khi bạn có nhiều thời gian.',
      tip: 'Cần vé/thẻ bơi và đồ bơi; tính thêm thời gian thay đồ.' },
    { id: 'san-bong-ro', name: 'Sân bóng rổ KTX Bách Khoa', short: 'Sân bóng rổ', kind: 'sport', lat: 21.005832, lng: 105.846192,
      needs: ['move', 'social'], area: 'campus',
      desc: 'Sân bóng rổ ngoài trời cạnh dãy KTX B7 – B8, có ghế ngồi xung quanh.' },
    { id: 'the-duc-b6', name: 'Khu tập thể dục ngoài trời B6', short: 'Khu tập B6', kind: 'sport', lat: 21.006196, lng: 105.846818,
      needs: ['move'], area: 'campus', minRest: 5,
      desc: 'Khu dụng cụ tập thể dục ngoài trời gần KTX B6 – B9.' },

    // ── Cà phê ───────────────────────────────────────
    { id: 'highlands-tdn', name: 'Highlands Coffee Trần Đại Nghĩa', short: 'Highlands', kind: 'cafe', lat: 21.004871, lng: 105.845879,
      needs: ['drink', 'social', 'work'], area: 'campus',
      desc: 'Quán cà phê chuỗi ngay trên phố Trần Đại Nghĩa đoạn qua trường, có chỗ ngồi trong nhà.' },
    { id: 'cafe-moc', name: 'Cafe Mộc', short: 'Cafe Mộc', kind: 'cafe', lat: 21.005754, lng: 105.845859,
      needs: ['drink', 'social'], area: 'campus', hours: '07:00 – 23:00',
      desc: 'Quán cà phê nhỏ trên phố Trần Đại Nghĩa, cạnh khu KTX.' },
    { id: 'kopee', name: 'KOPee coffee', short: 'KOPee', kind: 'cafe', lat: 21.005876, lng: 105.845829,
      needs: ['drink', 'social'], area: 'campus',
      desc: 'Quán cà phê trên phố Trần Đại Nghĩa, gần Cafe Mộc.' },
    { id: 'goc-pho', name: 'Cà Phê Góc Phố', short: 'Góc Phố', kind: 'cafe', lat: 21.006332, lng: 105.845685,
      needs: ['drink', 'social'], area: 'campus', hours: '07:00 – 23:00',
      desc: 'Quán cà phê góc phố Trần Đại Nghĩa, gần cổng khu C.' },
    { id: 'maxx', name: 'Cà Phê Maxx', short: 'Maxx', kind: 'cafe', lat: 21.002356, lng: 105.844908,
      needs: ['drink', 'work'], area: 'campus',
      desc: 'Quán cà phê trên phố Trần Đại Nghĩa đoạn gần Lê Thanh Nghị.' },
    { id: 'tch-tqb', name: 'The Coffee House Tạ Quang Bửu', short: 'The Coffee House', kind: 'cafe', lat: 21.003495, lng: 105.847931,
      needs: ['drink', 'work', 'social'], area: 'campus',
      desc: 'Quán cà phê chuỗi phía đông trường, không gian rộng, hợp mở laptop.' },
    { id: 'tch-tdn', name: 'The Coffee House Trần Đại Nghĩa', short: 'TCH Trần Đại Nghĩa', kind: 'cafe', lat: 21.001154, lng: 105.845362,
      needs: ['drink', 'work'], area: 'nearby',
      desc: 'Quán cà phê chuỗi phía nam trường, trên phố Trần Đại Nghĩa.' },
    { id: 'katinat', name: 'Katinat Lê Thanh Nghị', short: 'Katinat', kind: 'cafe', lat: 21.001687, lng: 105.844943,
      needs: ['drink', 'social', 'work'], area: 'nearby', hours: '07:00 – 22:30',
      desc: 'Quán cà phê chuỗi trên phố Lê Thanh Nghị.' },
    { id: 'sipping-bar', name: 'The Sipping Bar', short: 'Sipping Bar', kind: 'cafe', lat: 21.008409, lng: 105.844919,
      needs: ['drink', 'social'], area: 'nearby', hours: '09:00 – 21:30',
      desc: 'Quán đồ uống trên đường Đại Cồ Việt, đối diện khu C.' },
    { id: 'infact', name: 'Cà Phê Infact', short: 'Infact', kind: 'cafe', lat: 21.008901, lng: 105.848944,
      needs: ['drink', 'work'], area: 'nearby', hours: '08:00 – 22:00',
      desc: 'Quán cà phê trên phố Bà Triệu.' },
    { id: 'mono', name: 'MONO Coffee Lab', short: 'MONO', kind: 'cafe', lat: 21.010524, lng: 105.846579,
      needs: ['drink', 'work'], area: 'nearby',
      desc: 'Quán cà phê trong ngõ 55 Vân Hồ 2, khá yên.' },
    { id: 'highlands-kl', name: 'Highlands Coffee Kim Liên', short: 'Highlands Kim Liên', kind: 'cafe', lat: 21.006944, lng: 105.840536,
      needs: ['drink', 'social', 'work'], area: 'nearby',
      desc: 'Quán cà phê chuỗi gần ngã tư Kim Liên.' },
    { id: 'kien', name: 'Cà Phê Kiến', short: 'Cà Phê Kiến', kind: 'cafe', lat: 21.009262, lng: 105.847638,
      needs: ['drink', 'social'], area: 'nearby',
      desc: 'Quán cà phê trên phố Hoa Lư.' },
    { id: 'mixue', name: 'Mixue Trần Đại Nghĩa', short: 'Mixue', kind: 'tea', lat: 21.003217, lng: 105.844502,
      needs: ['drink', 'social'], area: 'campus',
      desc: 'Kem và trà sữa giá sinh viên, mua mang đi nhanh.' },
    { id: 'tocotoco', name: 'ToCoToCo Trần Đại Nghĩa', short: 'ToCoToCo', kind: 'tea', lat: 21.001054, lng: 105.845216,
      needs: ['drink', 'social'], area: 'nearby',
      desc: 'Trà sữa trên phố Trần Đại Nghĩa.' },

    // ── Ăn uống ──────────────────────────────────────
    { id: 'nha-an-qt', name: 'Nhà ăn sinh viên quốc tế', short: 'Nhà ăn SV quốc tế', kind: 'canteen', lat: 21.005433, lng: 105.846409,
      needs: ['food', 'social'], area: 'campus',
      desc: 'Nhà ăn trong khu KTX, cơm suất cho sinh viên.' },
    { id: 'nha-an-a15', name: 'Nhà ăn A1-5', short: 'Nhà ăn A1-5', kind: 'canteen', lat: 21.004387, lng: 105.847600,
      needs: ['food', 'social'], area: 'campus',
      desc: 'Nhà ăn trên phố Tạ Quang Bửu, phía đông trường.' },
    { id: 'cang-tin-b59', name: 'Căng tin B5-9', short: 'Căng tin B5-9', kind: 'canteen', lat: 21.006240, lng: 105.847120,
      needs: ['food', 'drink', 'social'], area: 'campus',
      desc: 'Căng tin giữa dãy KTX B5 và B9, có đồ ăn và nước.' },
    { id: 'bun-oc', name: 'Bún Ốc Chuối Đậu', short: 'Bún ốc', kind: 'food', lat: 21.005957, lng: 105.845838,
      needs: ['food'], area: 'campus',
      desc: 'Quán bún trên phố Trần Đại Nghĩa.' },
    { id: 'kombo', name: 'Kombo', short: 'Kombo', kind: 'food', lat: 21.002190, lng: 105.844616,
      needs: ['food', 'social'], area: 'nearby',
      desc: 'Quán ăn trên phố Trần Đại Nghĩa, gần Lê Thanh Nghị.' },
    { id: 'lotteria', name: 'Lotteria Trần Đại Nghĩa', short: 'Lotteria', kind: 'food', lat: 21.001967, lng: 105.845234,
      needs: ['food', 'drink', 'social'], area: 'nearby',
      desc: 'Đồ ăn nhanh, có chỗ ngồi máy lạnh.' },
    { id: 'popeyes', name: 'Popeyes Lê Thanh Nghị', short: 'Popeyes', kind: 'food', lat: 21.001997, lng: 105.846304,
      needs: ['food', 'drink', 'social'], area: 'nearby',
      desc: 'Gà rán, đồ ăn nhanh trên phố Lê Thanh Nghị.' },
    { id: 'hai-yen', name: 'Nhà hàng Hải Yến Bách Khoa', short: 'Hải Yến', kind: 'food', lat: 21.004870, lng: 105.842522,
      needs: ['food', 'social'], area: 'campus', minRest: 30,
      desc: 'Nhà hàng hải sản cạnh khu D2 — hợp khi đi ăn nhóm và có nhiều thời gian.' },
    { id: 'banh-trang', name: 'Bánh Tráng Phú Cường (Bà Triệu)', short: 'Bánh tráng PC', kind: 'food', lat: 21.009213, lng: 105.848924,
      needs: ['food', 'social'], area: 'nearby',
      desc: 'Quán bánh tráng cuốn trên phố Bà Triệu.' },

    // ── Cửa hàng tiện lợi ────────────────────────────
    { id: 'sivimart', name: 'Sivimart Trần Đại Nghĩa', short: 'Sivimart', kind: 'store', lat: 21.003575, lng: 105.844529,
      needs: ['drink', 'food'], area: 'campus', desc: 'Cửa hàng tiện lợi gần D7 – D9: nước, đồ ăn nhẹ.' },
    { id: 'gt-mart', name: 'GT Mart Tạ Quang Bửu', short: 'GT Mart', kind: 'store', lat: 21.004064, lng: 105.846582,
      needs: ['drink', 'food'], area: 'campus', desc: 'Cửa hàng tự chọn gần nhà B1.' },
    { id: 'nam-phong', name: 'Siêu thị mini Nam Phong', short: 'Nam Phong', kind: 'store', lat: 21.005100, lng: 105.846812,
      needs: ['drink', 'food'], area: 'campus', desc: 'Siêu thị mini trong khu KTX.' },
    { id: 'circlek-tdn', name: 'Circle K Trần Đại Nghĩa', short: 'Circle K', kind: 'store', lat: 21.002711, lng: 105.844855,
      needs: ['drink', 'food'], area: 'campus', desc: 'Cửa hàng tiện lợi, có vài chỗ ngồi ăn nhanh.' },
    { id: 'circlek-ltn', name: 'Circle K Lê Thanh Nghị', short: 'Circle K LTN', kind: 'store', lat: 21.001611, lng: 105.846543,
      needs: ['drink', 'food'], area: 'nearby', hours: 'Mở 24/7', desc: 'Cửa hàng tiện lợi trong ngõ 37 Lê Thanh Nghị.' },
    { id: 'winmart-ltn', name: 'WinMart+ Lê Thanh Nghị', short: 'WinMart+', kind: 'store', lat: 21.002066, lng: 105.846410,
      needs: ['drink', 'food'], area: 'nearby', desc: 'Siêu thị mini trên phố Lê Thanh Nghị.' },

    // ── Máy bán nước ─────────────────────────────────
    { id: 'vm-d3', name: 'Máy bán nước sảnh D3', short: 'Máy nước D3', kind: 'vending', lat: 21.004812, lng: 105.845030,
      needs: ['drink'], area: 'campus', desc: 'Máy bán nước tự động ở sảnh tòa D3.' },
    { id: 'vm-tv', name: 'Máy bán nước Thư viện – D5', short: 'Máy nước TV–D5', kind: 'vending', lat: 21.004333, lng: 105.844634,
      needs: ['drink'], area: 'campus', desc: 'Máy bán nước giữa thư viện Tạ Quang Bửu và tòa D5.' },
    { id: 'vm-d9', name: 'Máy bán nước & vòi nước D7 – D9', short: 'Máy nước D7–D9', kind: 'vending', lat: 21.003900, lng: 105.844520,
      needs: ['drink'], area: 'campus', desc: 'Máy bán nước tự động và vòi nước uống giữa D7 và D9.' },
    { id: 'vm-d6', name: 'Máy bán nước D6 – D8', short: 'Máy nước D6–D8', kind: 'vending', lat: 21.004238, lng: 105.842791,
      needs: ['drink'], area: 'campus', desc: 'Máy bán nước gần cụm ghế đá D6 – D8.' },
    { id: 'vm-c10', name: 'Máy bán nước C10', short: 'Máy nước C10', kind: 'vending', lat: 21.005291, lng: 105.844485,
      needs: ['drink'], area: 'campus', desc: 'Máy bán nước gần tòa C10.' },

    // ── Công viên & hồ quanh trường ──────────────────
    { id: 'cv-thong-nhat', name: 'Công viên Thống Nhất', short: 'CV Thống Nhất', kind: 'park', lat: 21.012508, lng: 105.844525,
      needs: ['quiet', 'move', 'social'], area: 'nearby', minRest: 20, hours: '06:00 – 22:00',
      desc: 'Công viên lớn phía bắc trường (qua đường Đại Cồ Việt), nhiều cây xanh, ghế đá và đường dạo.' },
    { id: 'ho-bay-mau', name: 'Bờ Hồ Bảy Mẫu', short: 'Hồ Bảy Mẫu', kind: 'park', lat: 21.011524, lng: 105.843611,
      needs: ['quiet', 'move'], area: 'nearby', minRest: 20,
      desc: 'Hồ lớn trong Công viên Thống Nhất, đi dạo quanh bờ rất mát.' },
    { id: 'vh-kim-lien', name: 'Vườn hoa Kim Liên', short: 'VH Kim Liên', kind: 'park', lat: 21.008128, lng: 105.839511,
      needs: ['quiet'], area: 'nearby', desc: 'Vườn hoa nhỏ gần ngã tư Kim Liên, có ghế ngồi.' },
    { id: 'ho-kim-lien', name: 'Hồ Kim Liên', short: 'Hồ Kim Liên', kind: 'park', lat: 21.005257, lng: 105.837120,
      needs: ['quiet', 'move'], area: 'nearby', desc: 'Hồ trong khu tập thể Kim Liên, có đường đi dạo quanh hồ.' },
    { id: 'ho-thanh-nhan', name: 'Hồ Thanh Nhàn', short: 'Hồ Thanh Nhàn', kind: 'park', lat: 21.007093, lng: 105.854056,
      needs: ['move', 'quiet'], area: 'nearby', desc: 'Hồ phía đông trường, có đường dạo bộ.' },
    { id: 'cv-vo-thi-sau', name: 'Công viên Võ Thị Sáu', short: 'CV Võ Thị Sáu', kind: 'park', lat: 21.005540, lng: 105.857052,
      needs: ['move', 'quiet'], area: 'nearby', hours: 'Mở cả ngày', desc: 'Công viên nhỏ trên phố Võ Thị Sáu.' },
    { id: 'vh-neu', name: 'Vườn hoa ĐH Kinh tế Quốc dân', short: 'VH Kinh tế QD', kind: 'park', lat: 20.999488, lng: 105.844394,
      needs: ['quiet', 'move'], area: 'nearby', desc: 'Vườn hoa trong khuôn viên NEU, phía nam phố Lê Thanh Nghị.' },
    { id: 'ho-thien-quang', name: 'Hồ Thiền Quang', short: 'Hồ Thiền Quang', kind: 'park', lat: 21.018433, lng: 105.845526,
      needs: ['quiet', 'move'], area: 'nearby', minRest: 20, desc: 'Hồ phía bắc Công viên Thống Nhất, đi dạo quanh hồ.' },
    { id: 'vh-dan-nam', name: 'Vườn hoa Đàn Nam', short: 'VH Đàn Nam', kind: 'park', lat: 21.010847, lng: 105.850010,
      needs: ['quiet'], area: 'nearby', desc: 'Vườn hoa nhỏ gần phố Bà Triệu.' },

    // ── Trung tâm thương mại ─────────────────────────
    { id: 'vincom-bt', name: 'Vincom Center Bà Triệu', short: 'Vincom Bà Triệu', kind: 'mall', lat: 21.011276, lng: 105.849785,
      needs: ['food', 'drink', 'social', 'work'], area: 'nearby', hours: '09:00 – 22:00',
      desc: 'Trung tâm thương mại có khu ẩm thực, quán cà phê, máy lạnh.' },
    { id: 'vincom-pnt', name: 'Vincom Phạm Ngọc Thạch', short: 'Vincom PNT', kind: 'mall', lat: 21.006285, lng: 105.831982,
      needs: ['food', 'drink', 'social'], area: 'nearby', hours: '09:00 – 22:00',
      desc: 'Trung tâm thương mại phía tây, nhiều quán ăn và đồ uống.' },
    { id: 'cho-mo', name: 'TTTM Chợ Mơ', short: 'Chợ Mơ', kind: 'mall', lat: 20.996891, lng: 105.850585, hours: '08:00 – 22:00',
      needs: ['food', 'social'], area: 'nearby', desc: 'Trung tâm thương mại & chợ, nhiều hàng ăn.' },
  ];

  const dorms = [
    ['B3', 21.005614, 105.847602], ['B5', 21.006418, 105.846893], ['B5b', 21.006574, 105.846899],
    ['B6', 21.006459, 105.846131], ['B7', 21.006047, 105.846107], ['B7bis', 21.005665, 105.846091],
    ['B8', 21.005256, 105.846076], ['B9', 21.006038, 105.846887], ['B10', 21.005286, 105.847503],
    ['B13', 21.006571, 105.847609], ['B13b', 21.006733, 105.847632],
    ['A2', 21.002889, 105.848895], ['A3', 21.003221, 105.848594],
  ].map(([code, lat, lng]) => ({ id: 'KTX-' + code, code, name: 'Ký túc xá ' + code, short: 'KTX ' + code, lat, lng }));

  const originGroups = [
    { label: 'Giảng đường khu D', ids: ['D2', 'D3', 'D3-5', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9'] },
    { label: 'Giảng đường khu C', ids: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C9', 'C10'] },
    { label: 'Tòa & không gian khác', ids: ['lib-tqb', 'B1', 'TC', 'HiTech', 'digital-hub', 'ho-tien', 'qt-c1', 'nha-thi-dau'] },
    { label: 'Ký túc xá', ids: dorms.map((d) => d.id) },
  ];

  return {
    center: { lat: 21.00437, lng: 105.84553 },
    radius: 2000,                       // giới hạn không gian: 2 km quanh vị trí hiện tại
    walk: { speed: 75, detour: 1.35 },  // m/phút (~4,5 km/h) · hệ số đường vòng so với đường chim bay
    shortBreak: 10,                     // < 10 phút: chỉ mua nước / nghỉ tại chỗ
    needs, kinds, places, dorms, originGroups,
  };
})();
