import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  DataTable,
  DataTableState,
  DataToolbar,
  EmptyState,
  Pagination,
  Pill,
  SearchBar,
  SectionCard,
} from "../../../components/ui";
import { Sparkles } from "lucide-react";

const PAGE_SIZE = 6;

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất trước" },
  { value: "oldest", label: "Cũ nhất trước" },
  { value: "score_desc", label: "Điểm cao trước" },
  { value: "score_asc", label: "Điểm thấp trước" },
  { value: "status", label: "Trạng thái A-Z" },
];

const HISTORY_COLUMNS = [
  { key: "select", label: "" },
  { key: "session", label: "Ngày & mã" },
  { key: "role", label: "Vị trí" },
  { key: "score", label: "Điểm" },
  { key: "result", label: "Trạng thái" },
  { key: "action", label: "Thao tác", className: "text-right" },
];

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

function toTimestamp(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function mapSession(session) {
  const type = session.session_type || "official";
  return {
    id: `INT-${session.id}`,
    date: session.created_at ? new Date(session.created_at).toLocaleString("vi-VN") : "Chưa có",
    role: session.job_posting?.title || session.practice_config?.target_role || (type === "practice" ? "Luyện tập tự do" : "Phiên phỏng vấn"),
    type,
    score: Math.round(session.evaluation?.overall_score || 0),
    status: session.evaluation?.evaluation?.hiring_recommendation || displayStatus(session.status),
    createdAtTs: toTimestamp(session.created_at),
    raw: session,
  };
}

function compareRows(sortBy) {
  return (a, b) => {
    if (sortBy === "oldest") return a.createdAtTs - b.createdAtTs;
    if (sortBy === "score_desc") return b.score - a.score || b.createdAtTs - a.createdAtTs;
    if (sortBy === "score_asc") return a.score - b.score || b.createdAtTs - a.createdAtTs;
    if (sortBy === "status") return String(a.status || "").localeCompare(String(b.status || ""), "vi") || b.createdAtTs - a.createdAtTs;
    return b.createdAtTs - a.createdAtTs;
  };
}

function HistorySection({
  title,
  subtitle,
  rows,
  emptyTitle,
  selectedSessionIds,
  onToggleSelect,
}) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const from = rows.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(safePage * PAGE_SIZE, rows.length);

  React.useEffect(() => {
    setPage(1);
  }, [rows.length]);

  return (
    <SectionCard
      title={title}
      subtitle={subtitle}
      action={<Pill tone="default">{rows.length} phiên</Pill>}
    >
      <DataTable columns={HISTORY_COLUMNS}>
        {pageRows.length ? (
          pageRows.map((row) => (
            <tr key={row.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedSessionIds.includes(row.raw.id)}
                  onChange={() => onToggleSelect(row.raw.id)}
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
            <EmptyState title={emptyTitle} />
          </DataTableState>
        )}
      </DataTable>

      {rows.length ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
          <p className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>
            Hiển thị {from} - {to} của {rows.length} phiên
          </p>
          <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : null}
    </SectionCard>
  );
}

export function InterviewHistoryScreen({ realSessions = [] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);

  const toggleSelectSession = (id) => {
    setSelectedSessionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const rows = useMemo(
    () =>
      realSessions
        .map(mapSession),
    [realSessions],
  );

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedRows = q
      ? rows.filter((row) => `${row.id} ${row.role} ${row.status}`.toLowerCase().includes(q))
      : rows;
    return [...matchedRows].sort(compareRows(sortBy));
  }, [query, rows, sortBy]);

  const officialRows = filteredRows.filter((row) => row.type !== "practice");
  const practiceRows = filteredRows.filter((row) => row.type === "practice");

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold" style={{ color: "var(--text)" }}>
              Kết quả
            </h2>
            <p className="text-sm" style={{ color: "var(--text-soft)" }}>
              Lịch sử phỏng vấn chính thức và lịch sử luyện tập được tách riêng, sắp xếp mới nhất trước.
            </p>
          </div>
          <Button onClick={() => navigate("/luyen-tap/tao-moi")}>
            <Sparkles size={16} /> Tạo phiên luyện tập
          </Button>
        </div>
      </header>

      <DataToolbar>
        <SearchBar
          value={query}
          placeholder="Tìm vị trí, mã phiên hoặc trạng thái"
          className="md:max-w-md"
          onChange={(event) => setQuery(event.target.value)}
        />
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          Sắp xếp
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-bold normal-case tracking-normal text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </DataToolbar>

      <HistorySection
        title="Lịch sử phỏng vấn chính thức"
        subtitle="Các phiên phỏng vấn ứng tuyển theo JD, kết quả được HR xem xét."
        rows={officialRows}
        emptyTitle="Chưa có lịch sử phỏng vấn chính thức"
        selectedSessionIds={selectedSessionIds}
        onToggleSelect={toggleSelectSession}
      />

      <HistorySection
        title="Lịch sử luyện tập"
        subtitle="Các phiên luyện tập tự do hoặc luyện theo JD để cải thiện kỹ năng trả lời."
        rows={practiceRows}
        emptyTitle="Chưa có lịch sử luyện tập"
        selectedSessionIds={selectedSessionIds}
        onToggleSelect={toggleSelectSession}
      />

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
