# Design System - AI Interview Assistant

## Mục tiêu

Giao diện dùng chung cho ba role Admin, HR và User theo hướng SaaS dashboard: rõ hierarchy, ít trang trí, dễ scan dữ liệu và dễ mở rộng trong thời gian ngắn.

## Vấn đề đã rà soát

- Layout trước đây trộn nhiều style: Tailwind inline, CSS riêng trong layout và `legacy.css`.
- Một số text bị lỗi encoding hoặc chưa nhất quán tiếng Việt/tiếng Anh.
- Header có ô tìm kiếm toàn cục nhưng chưa có hành vi xử lý, dễ gây hiểu nhầm.
- Button, input, card, modal dùng token chưa được khai báo đầy đủ.
- Admin dùng table riêng, dashboard dùng card riêng, dẫn đến spacing và radius lệch nhau.

## Token Chung

Color:
- Primary: `#2563eb` cho action chính và trạng thái active.
- Secondary: `#0f766e` cho accent HR.
- Background: `#f5f7fb`.
- Surface: `#ffffff`.
- Muted surface: `#f8fafc`.
- Border: `#dbe4ef`.
- Text: `#102033`.
- Muted text: `#64748b`.
- Status: success `#15803d`, warning `#b45309`, danger `#b91c1c`, info `#0369a1`.

Typography:
- Body: Inter, 14-16px, weight 400-700.
- Heading: Plus Jakarta Sans, weight 700-800.
- Page title: 20px, weight 800.
- Section title: 16-18px, weight 800.
- Table header: 12px uppercase, weight 800.

Spacing:
- Base unit: 4px.
- Form/table cell: 12-16px.
- Card padding: 16-24px.
- Page padding: desktop 24px, mobile 16px.
- Gap mặc định: 12-16px.

Shape and shadow:
- Button/input radius: 10px.
- Card/modal/table radius: 14px.
- Shadow mặc định nhẹ, ưu tiên border để tránh UI nặng.

## Component Chuẩn

Button:
- `primary`: CTA chính.
- `secondary`/`soft`: hành động phụ cùng ngữ cảnh.
- `ghost`: hành động ít quan trọng hoặc quay lại.
- `danger`: xóa/hủy nguy hiểm.

Input/Form:
- Dùng `Input` hoặc class `ds-input`.
- Label ngắn, hint/error nằm dưới field.
- Focus ring xanh nhẹ, không đổi layout.

Table:
- Dùng `DataTable` và `DataTableState` cho các bảng trong app.
- Nếu cần style cấp thấp, dùng `ds-table-wrap`, `ds-table-scroll`, `ds-table`.
- Header uppercase nhỏ, row hover nhẹ.
- Trạng thái loading/empty phải nằm trong table.

Card:
- Dùng `SectionCard` cho dashboard và nhóm nội dung.
- Không lồng nhiều card nếu chỉ cần chia section.
- Tiêu đề + subtitle ngắn, action đặt bên phải khi có.

Modal:
- Overlay tối có blur nhẹ.
- Header gồm title và icon close.
- Button action đặt cuối modal, primary ở bên phải.

Sidebar/Navbar:
- Sidebar dùng menu theo role nhưng giữ cùng cấu trúc.
- Phân biệt role bằng accent nhẹ: Admin/User xanh, HR xanh lá.
- Mobile chuyển sang navigation ngang để không chiếm chiều rộng.

## Trước vs Sau

Trước:
- Role labels và page titles thiếu nhất quán.
- Một số text bị lỗi encoding hoặc tiếng Anh.
- Search header không có chức năng.
- Admin table, dashboard card, modal và button lệch radius/spacing.

Sau:
- Token màu, radius, shadow và spacing được khai báo ở `src/index.css`.
- Layout dùng chung biến CSS, hỗ trợ dark mode nhất quán hơn.
- Sidebar/header rõ role hiện tại, bỏ search toàn cục chưa hoạt động.
- Dashboard overview, document library và admin user table dùng cùng ngôn ngữ UI.

## Cách triển khai tiếp

- Khi thêm trang mới, ưu tiên `MainLayout`, `PageHeader`, `DataToolbar`, `SectionCard`, `MetricCard`, `Button`, `Input`, `EmptyState`.
- Nếu cần bảng dữ liệu, dùng class `ds-table` thay vì viết table style mới.
- Không thêm text mô phỏng vào UI chính thức. Với tính năng chưa sẵn sàng, dùng notice trung tính: "Tính năng đang hoàn thiện".
