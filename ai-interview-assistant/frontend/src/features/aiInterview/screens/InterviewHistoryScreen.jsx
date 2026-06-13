import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DataTable,
  DataTableState,
  DataToolbar,
  EmptyState,
  Pagination,
  Pill,
  SearchBar,
  SectionCard,
  Button,
} from "../../../components/ui";
import { Sparkles } from "lucide-react";


const PAGE_SIZE = 8;

const HISTORY_COLUMNS = [
  { key: "select", label: "" },
  { key: "session", label: "Ngày & mã" },
  { key: "role", label: "Vị trí" },
  { key: "type", label: "Loại phiên" },
  { key: "score", label: "Điểm" },
  { key: "result", label: "Trạng thái" },
  { key: "action", label: "Thao tác", className: "text-right" },
];

function displaySessionType(type) {
  return type === "practice" ? "Luyện tập" : "Chính thức";
}

function displayStatus(status) {
  const labels = {
    created: "Đã tạo",
    questions_generated: "Sẵn sàng phỏng vấn",
    in_progress: "Đang phỏng vấn",
    submitted: "Đã nộp",
    transcribing: "Đang chuyển giọng nói",
    evaluating: "Đang đánh giá",
    completed: "Hoàn tất",
    failed: "Thất bại",
  };
  return labels[status] || status || "Chưa rõ";
}

export function InterviewHistoryScreen({ realSessions = [] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [page, setPage] = useState(1);

  const toggleSelectSession = (id) => {
    setSelectedSessionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };


  const sourceRows = useMemo(
    () =>
      realSessions.map((session) => ({
        id: `INT-${session.id}`,
        date: session.created_at ? new Date(session.created_at).toLocaleString("vi-VN") : "Chưa có",
        role: session.job_posting?.title || session.practice_config?.target_role || "Phiên phỏng vấn",
        type: session.session_type || "official",
        score: Math.round(session.evaluation?.overall_score || 0),
        status: session.evaluation?.evaluation?.hiring_recommendation || displayStatus(session.status),
        raw: session,
      })),
    [realSessions],
  );

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sourceRows.filter((row) => {
      const matchesQuery = !q || `${row.id} ${row.role}`.toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || row.type === typeFilter;
      return matchesQuery && matchesType;
    });
  }, [query, typeFilter, sourceRows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = filteredRows.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, filteredRows.length);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-extrabold" style={{ color: "var(--text)" }}>
          Lịch sử phỏng vấn
        </h2>
        <p className="text-sm" style={{ color: "var(--text-soft)" }}>
          Dữ liệu được đọc từ backend, gồm cả luyện tập và phỏng vấn chính thức.
        </p>
      </header>

      <DataToolbar>
        <SearchBar
          value={query}
          placeholder="Tìm vị trí hoặc mã phiên"
          className="md:max-w-md"
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
        <select
          className="ds-input w-full px-3 md:w-48"
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">Tất cả</option>
          <option value="official">Chính thức</option>
          <option value="practice">Luyện tập</option>
        </select>
      </DataToolbar>

      <SectionCard title="Danh sách phiên">
        <DataTable columns={HISTORY_COLUMNS}>
          {pageRows.length ? (
            pageRows.map((row) => (
              <tr key={row.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedSessionIds.includes(row.raw.id)}
                    onChange={() => toggleSelectSession(row.raw.id)}
                    disabled={row.raw.status !== "completed"}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
                    aria-label="Chọn phiên so sánh"
                  />
                </td>
                <td>
                  <div className="font-bold" style={{ color: "var(--text)" }}>{row.id}</div>
                  <div className="text-xs" style={{ color: "var(--text-soft)" }}>{row.date}</div>
                </td>
                <td className="font-semibold" style={{ color: "var(--text)" }}>{row.role}</td>
                <td><Pill tone="default">{displaySessionType(row.type)}</Pill></td>
                <td className="font-bold text-blue-600">{row.score}/100</td>
                <td style={{ color: "var(--text-soft)" }}>{row.status}</td>
                <td className="text-right">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(row.type === "practice" ? `/luyen-tap/${row.raw.id}/chi-tiet` : `/phong-van/${row.raw.id}/chi-tiet`)
                    }
                    className="font-bold text-blue-600 hover:underline"
                  >
                    Chi tiết
                  </button>
                </td>
              </tr>
            ))

          ) : (
            <DataTableState colSpan={HISTORY_COLUMNS.length} className="p-4">
              <EmptyState title="Không có phiên nào" />
            </DataTableState>
          )}
        </DataTable>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
          <p className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>
            Hiển thị {from} - {to} của {filteredRows.length} phiên
          </p>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </SectionCard>

      {/* Floating comparative toolbar */}
      {selectedSessionIds.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-6 animate-in slide-in-from-bottom-5 duration-300">
          <span className="text-sm font-bold">Đã chọn {selectedSessionIds.length} phiên</span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSessionIds([])}
              className="text-slate-400 hover:text-white border border-slate-700 bg-transparent hover:bg-slate-800"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/phong-van/so-sanh?sessionIds=${selectedSessionIds.join(",")}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center"
            >
              <Sparkles size={14} className="mr-1.5" /> So sánh bằng Gemini
            </Button>
          </div>
        </div>
      )}
    </div>

  );
}
