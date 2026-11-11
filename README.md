# Nghỉ đâu Bách Khoa?

Trang web một màn hình giúp sinh viên ĐH Bách khoa Hà Nội tìm chỗ nghỉ trong giờ trống.

## Chạy thử

Trang là HTML/CSS/JS thuần, không cần build. Cần Internet để tải Leaflet, nền bản đồ OpenStreetMap và dịch vụ chỉ đường.

```bash
python -m http.server 5173
```

Mở `http://localhost:5173`. (Mở thẳng file `index.html` cũng chạy, nhưng GPS cần `localhost` hoặc HTTPS.)

## Đầu vào → đầu ra

| Đầu vào | Ghi chú |
|---|---|
| Thời gian rảnh (phút) | nút −/+, thanh kéo, chọn nhanh 5'–120' |
| Nhu cầu | Yên tĩnh · Giao tiếp · Đi lại · Làm việc nhỏ · Có đồ ăn · Đồ uống (chọn nhiều) |
| Vị trí hiện tại | mở trang là tự hỏi quyền vị trí (GPS); không được phép / ngoài bán kính 3 km thì dùng tòa đã chọn lần trước (mặc định D3). Vẫn có thể chọn tòa trong danh sách hoặc chạm lên bản đồ |
| Đang ở KTX? | bật để thêm lựa chọn "về phòng KTX nghỉ" (chọn tòa KTX) |

**Quy tắc lọc** (trong `js/app.js` › `compute()`):

- Thời gian đi bộ một chiều `w = ⌈khoảng cách × 1,35 ÷ 75 m/phút⌉` (đường chim bay × hệ số đường vòng). Dưới 40 m thì tính là 0 (cùng tòa).
- Giữ nơi thỏa `2w ≤ T/2`, tức thời gian nghỉ `T − 2w ≥ T/2`, và nằm trong bán kính **2 km**.
- Một số nơi cần thời gian nghỉ tối thiểu mới đáng đi (`minRest`, ví dụ bể bơi 40', nhà hàng 30').
- **Rảnh dưới 10 phút**: chỉ gợi ý nghỉ ngay tại tòa đang đứng hoặc mua nước ở điểm gần nhất (nếu kịp đi về).
- Giảng đường/tòa học được tính là nơi nghỉ, nhưng chỉ gợi ý theo tòa vì chưa có dữ liệu từng phòng.

Khi bấm **Chỉ đường**, trang lấy tuyến đi bộ thật từ OSRM (`routing.openstreetmap.de`, profile foot) và kiểm tra lại quy tắc ½ theo thời gian thực tế. Nếu không gọi được dịch vụ, trang vẽ đường thẳng và dùng thời gian ước tính.

## Hiệu ứng Swarm

`js/swarm.js` là một bầy con trỏ chuột:

- **Mở trang**: các con trỏ bay vào, chỉ vào giữa màn hình để bản đồ hiện ra, rồi kéo khung chọn để dựng từng phần của bảng điều khiển.
- **Mỗi lần bảng thay đổi** (`swarm.rebuild()` / `rebuildWaves()`): giống hệt lúc mở trang — mục bị đổi biến mất hẳn, con trỏ bay tới kéo khung chọn (kèm nhãn của mục), kéo xong thì mục đó hiện ra lại. Dựng theo các mục `data-build`: bấm nút trong mục nào thì dựng lại mục đó (Thời gian rảnh, Nhu cầu, Vị trí, Kết quả, Điều khiển…), cộng thêm các mục bị ảnh hưởng (thường là Kết quả, bản đồ). Mở lại bảng, đổi nấc bottom sheet hay bật lại Swarm thì dựng hai đợt: khung bảng trước, rồi tới từng mục. Đang kéo thanh thời gian / gõ số phút thì chỉ dựng lại Kết quả, thả tay hoặc rời ô mới dựng lại mục Thời gian. Vùng bản đồ thì được phủ mờ và hiện rõ dần theo khung. Phần nào đang được dựng thì không dựng chồng; hết con trỏ rảnh thì lấy bớt con trỏ đang giữ node. Thêm `data-rb="off"` vào nút nào muốn bỏ qua.
- **Sau khi chọn nhu cầu / thời gian**: dựng lại giao diện xong, mỗi con trỏ bay tới một khu vực, đặt node lên bản đồ kèm nhãn (tên + phút đi bộ), nối nét đứt về vị trí của bạn.
- **Máy tính**: rê chuột thì bầy bám theo; chuột đứng yên khoảng 1,2 giây thì bầy xếp thành vòng tròn quanh con trỏ.
- **Điện thoại**: không chạm khoảng 2 giây thì vòng tròn về giữa vùng bản đồ; kéo ngón tay thì vòng tròn đi theo.
- Nút ✦ ở cột điều khiển bên phải để bật/tắt. Hiệu ứng tự tắt nếu máy bật "giảm chuyển động".

## Giao diện điện thoại

Bảng tìm kiếm thành bottom sheet có 3 nấc (kéo hoặc chạm thanh xám), tự thu gọn khi kéo bản đồ, khi các node đang hiện và khi đang chỉ đường. Nút ⤡ thu cả bảng thành một nút "Tìm chỗ nghỉ".

## Dữ liệu

`js/data.js` gồm khoảng 85 địa điểm và 13 tòa KTX. Tọa độ lấy từ OpenStreetMap (© OpenStreetMap contributors, ODbL), tra cứu tháng 11/2026. Giờ mở cửa chỉ ghi khi OSM có dữ liệu. Muốn thêm hoặc sửa địa điểm thì sửa mảng `places`.

## Cấu trúc

```
index.html      khung trang
css/style.css   giao diện (sáng/tối, desktop/điện thoại)
js/data.js      địa điểm, nhu cầu, loại địa điểm, KTX
js/icons.js     bộ icon SVG
js/swarm.js     hiệu ứng Swarm
js/app.js       logic: tính kết quả, bản đồ, chi tiết, chỉ đường, bottom sheet
```
