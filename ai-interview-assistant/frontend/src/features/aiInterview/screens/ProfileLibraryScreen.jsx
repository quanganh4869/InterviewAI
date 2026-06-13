import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  ImagePlus,
  Pencil,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Button, EmptyState, Input, SectionCard, Select, StatusBadge, Textarea } from "../../../components/ui";

const INITIAL_JD_FORM = {
  title: "",
  company: "",
  companyWebsiteUrl: "",
  location: "",
  salary: "",
  workType: "",
  experience: "",
  level: "",
  deadline: "",
  description: "",
  requirements: "",
  benefits: "",
};

const JD_BOOK_PAGES = ["Công ty", "Vai trò", "Nội dung", "Xem lại"];
const SALARY_OPTIONS = ["Thỏa thuận", "Dưới 8M VND", "8-12M VND", "12-18M VND", "18-25M VND", "25-35M VND", "35-50M VND", "Trên 50M VND"];
const EXPERIENCE_OPTIONS = ["Không yêu cầu", "Dưới 6 tháng", "6 tháng - 1 năm", "1-2 năm", "2-3 năm", "3-5 năm", "5-7 năm", "Trên 7 năm"];
const WORK_TYPE_OPTIONS = ["Full-time", "Part-time", "Internship", "Contract", "Remote", "Hybrid", "Onsite"];
const CANDIDATE_LEVEL_OPTIONS = ["Intern", "Fresher", "Junior", "Middle", "Senior", "Lead", "Manager", "Director"];

function buildJdSummary(form) {
  return [
    form.companyWebsiteUrl ? `Company website: ${form.companyWebsiteUrl}` : "",
    form.location ? `Location: ${form.location}` : "",
    form.salary ? `Salary: ${form.salary}` : "",
    form.workType ? `Work type: ${form.workType}` : "",
    form.experience ? `Experience: ${form.experience}` : "",
    form.level ? `Candidate level: ${form.level}` : "",
    form.deadline ? `Deadline: ${form.deadline}` : "",
    "",
    "Job description:",
    form.description,
    "",
    "Requirements:",
    form.requirements,
    "",
    "Benefits:",
    form.benefits,
  ]
    .filter((line, index, arr) => line || arr[index - 1])
    .join("\n")
    .trim();
}

function createJdTextFile(form) {
  const content = [`Job title: ${form.title}`, `Company: ${form.company}`, buildJdSummary(form)].join("\n\n");
  const safeName = `${form.title || "JD"}-${form.company || "company"}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return new File([content], `${safeName || "jd"}.txt`, { type: "text/plain" });
}

export function ProfileLibraryScreen({
  userRole = "",
  extraCvRows = [],
  extraJdRows = [],
  onUploadCv,
  onCreateJd,
  onOpenCvDetail,
  onOpenCustomJdDetail,
  onEditCv,
  onEditJd,
  onDeleteCv,
  onDeleteJd,
  onPublishJd,
  publishingJdId,
}) {
  const [jdForm, setJdForm] = useState(INITIAL_JD_FORM);
  const [logoPreview, setLogoPreview] = useState("");
  const [isSubmittingJd, setIsSubmittingJd] = useState(false);
  const [isJdBookOpen, setIsJdBookOpen] = useState(false);
  const [jdBookSpread, setJdBookSpread] = useState(0);
  const normalizedRole = String(userRole || "").toLowerCase();
  const isAdmin = normalizedRole.includes("admin");
  const isRecruiter = normalizedRole.includes("hr") || normalizedRole.includes("recruiter");
  const isCandidate = !isRecruiter && !isAdmin;
  const canManageCv = isCandidate || isAdmin;
  const canManageJd = isRecruiter || isAdmin;
  const maxSpread = Math.ceil(JD_BOOK_PAGES.length / 2) - 1;

  const handleCvFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) onUploadCv?.(file);
    event.target.value = "";
  };

  const handleJdFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) onCreateJd?.(file);
    event.target.value = "";
  };

  const updateJdForm = (field, value) => {
    setJdForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    event.target.value = "";
  };

  const canSubmitJdForm = useMemo(
    () => Boolean(jdForm.title.trim() && jdForm.company.trim() && jdForm.description.trim() && jdForm.requirements.trim()),
    [jdForm],
  );

  const openJdBook = () => {
    setJdBookSpread(0);
    setIsJdBookOpen(true);
  };

  const closeJdBook = () => {
    setIsJdBookOpen(false);
  };

  const resetJdForm = () => {
    setJdForm(INITIAL_JD_FORM);
    setLogoPreview("");
    setJdBookSpread(0);
  };

  const handleSubmitJdForm = async (event) => {
    event.preventDefault();
    if (!canSubmitJdForm) return;
    setIsSubmittingJd(true);
    const success = await onCreateJd?.({
      file: createJdTextFile(jdForm),
      title: jdForm.title.trim(),
      company: jdForm.company.trim(),
      summary: buildJdSummary(jdForm),
    });
    setIsSubmittingJd(false);
    if (success !== false) {
      resetJdForm();
      setIsJdBookOpen(false);
    }
  };

  const title = isAdmin ? "CV & JD" : isRecruiter ? "Quản lý JD" : "Hồ sơ CV";
  const subtitle = isAdmin
    ? "Kiểm tra, chỉnh sửa và loại bỏ tài liệu không hợp lệ."
    : isRecruiter
      ? "Tạo JD bằng form chuẩn theo từng trang: công ty, vai trò, nội dung và xem lại."
      : "Tải CV lên để mở việc làm phù hợp và luyện phỏng vấn.";

  const roleClass = isAdmin ? "admin" : isRecruiter ? "hr" : "user";

  return (
    <div className={`role-workspace ${roleClass} space-y-6`}>
      <header className={isCandidate ? "flex flex-col justify-between gap-4 sm:flex-row sm:items-start" : "role-hero"}>
        <div className={isCandidate ? "contents" : "role-hero-content"}>
          <div>
            <StatusBadge status={isAdmin ? "active" : isRecruiter ? "reviewing" : "applied"}>
              {isAdmin ? "Thư viện quản trị" : isRecruiter ? "Kho JD tuyển dụng" : "Hồ sơ CV"}
            </StatusBadge>
            <h2 className="text-2xl font-extrabold" style={{ color: "var(--text)" }}>
              {title}
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-soft)" }}>
              {subtitle}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canManageCv ? (
              <>
                <input type="file" id="cv-upload-input" className="hidden" accept=".pdf,.doc,.docx" onChange={handleCvFileChange} />
                <Button variant={isCandidate ? "primary" : "secondary"} onClick={() => document.getElementById("cv-upload-input")?.click()}>
                  <Plus size={16} /> Tải CV
                </Button>
              </>
            ) : null}

            {canManageJd && !isRecruiter ? (
              <>
                <input type="file" id="jd-upload-input" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleJdFileChange} />
                <Button variant="primary" onClick={() => document.getElementById("jd-upload-input")?.click()}>
                  <Plus size={16} /> Tải JD
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="space-y-6">
        {canManageCv ? (
          <SectionCard title={`CV (${extraCvRows.length})`}>
            {extraCvRows.length ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {extraCvRows.map((cv) => (
                  <DocumentCard
                    key={cv.id}
                    icon={User}
                    tone="blue"
                    title={cv.name}
                    subtitle={cv.role}
                    meta={`Cập nhật: ${cv.updatedAt}`}
                    onOpen={() => onOpenCvDetail?.(cv.id, cv)}
                    onEdit={isAdmin ? () => onEditCv?.(cv) : null}
                    onDelete={() => onDeleteCv?.(cv.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="Chưa có CV" description="Tải CV định dạng PDF, DOC hoặc DOCX để hệ thống phân tích." icon={FileText} />
            )}
          </SectionCard>
        ) : null}

        {canManageJd ? (
          <SectionCard
            title={`JD (${extraJdRows.length})`}
            subtitle={isRecruiter ? "JD được tạo từ form sẽ xuất hiện thành việc làm cho ứng viên." : undefined}
            action={isRecruiter ? <Button variant="primary" size="sm" onClick={openJdBook}><Plus size={15} /> Tạo JD</Button> : null}
          >
            {extraJdRows.length ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {extraJdRows.map((jd) => (
                  <DocumentCard
                    key={jd.id}
                    icon={Briefcase}
                    tone="amber"
                    title={jd.title}
                    subtitle={jd.company}
                    meta={`Đăng: ${jd.postedAt}`}
                    imageUrl={jd.logoUrl}
                    onOpen={() => onOpenCustomJdDetail?.(jd.id)}
                    onEdit={isAdmin || isRecruiter ? () => onEditJd?.(jd) : null}
                    onDelete={() => onDeleteJd?.(jd.id)}
                    onPublish={isAdmin || isRecruiter ? () => onPublishJd?.(jd) : null}
                    isPublishing={publishingJdId === jd.id}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Chưa có JD"
                description={isRecruiter ? "Bấm Tạo JD để nhập thông tin tuyển dụng theo từng trang." : "Tải JD lên để bắt đầu đối chiếu với CV ứng viên."}
                icon={Briefcase}
              />
            )}
          </SectionCard>
        ) : null}
      </main>

      {isJdBookOpen ? (
        <JdBookDialog
          form={jdForm}
          spread={jdBookSpread}
          maxSpread={maxSpread}
          logoPreview={logoPreview}
          canSubmit={canSubmitJdForm}
          isSubmitting={isSubmittingJd}
          onChange={updateJdForm}
          onLogoFileChange={handleLogoFileChange}
          onSpreadChange={setJdBookSpread}
          onClose={closeJdBook}
          onReset={resetJdForm}
          onSubmit={handleSubmitJdForm}
        />
      ) : null}
    </div>
  );
}

function JdBookDialog({
  form,
  spread,
  maxSpread,
  logoPreview,
  canSubmit,
  isSubmitting,
  onChange,
  onLogoFileChange,
  onSpreadChange,
  onClose,
  onReset,
  onSubmit,
}) {
  const leftPage = spread * 2;
  const rightPage = leftPage + 1;

  const dialog = (
    <div className="jd-book-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <form className="jd-book-modal" onSubmit={onSubmit} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="jd-book-close" onClick={onClose} aria-label="Đóng cửa sổ tạo JD">
          <X size={18} />
        </button>

        <div className="jd-book-shell" onClick={(event) => event.stopPropagation()}>
          <div className="jd-book-spread">
            <BookPage
              index={leftPage}
              form={form}
              logoPreview={logoPreview}
              canSubmit={canSubmit}
              isSubmitting={isSubmitting}
              onChange={onChange}
              onLogoFileChange={onLogoFileChange}
              onReset={onReset}
            />
            <BookPage
              index={rightPage}
              form={form}
              logoPreview={logoPreview}
              canSubmit={canSubmit}
              isSubmitting={isSubmitting}
              onChange={onChange}
              onLogoFileChange={onLogoFileChange}
              onReset={onReset}
            />
          </div>
          <div className="jd-book-page-indicator">
            <button
              type="button"
              className="jd-book-page-arrow"
              onClick={() => onSpreadChange(Math.max(0, spread - 1))}
              disabled={spread === 0}
              aria-label="Trang trước"
            >
              <ChevronLeft size={16} />
            </button>
            {JD_BOOK_PAGES.map((label, index) => (
              <button
                key={label}
                type="button"
                className={`jd-book-page-marker ${index >= leftPage && index <= rightPage ? "active" : ""}`}
                onClick={() => onSpreadChange(Math.floor(index / 2))}
                aria-label={`Mở trang ${index + 1}: ${label}`}
              />
            ))}
            <button
              type="button"
              className="jd-book-page-arrow"
              onClick={() => onSpreadChange(Math.min(maxSpread, spread + 1))}
              disabled={spread === maxSpread}
              aria-label="Trang sau"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

      </form>
    </div>
  );

  if (typeof document === "undefined") return dialog;
  return createPortal(dialog, document.body);
}

function BookPage({ index, form, logoPreview, canSubmit, isSubmitting, onChange, onLogoFileChange, onReset }) {
  if (index === 0) {
    return (
      <section className="jd-book-page">
        <BookPageHeader number="01" title="Thông tin công ty" />
        <div className="jd-company-logo-box book">
          <div className="jd-company-logo-preview">
            {logoPreview ? <img src={logoPreview} alt="Logo công ty" /> : <Building2 size={28} />}
          </div>
          <div className="min-w-0">
            <strong>Hình ảnh công ty</strong>
            <span>Chọn ảnh đại diện công ty để JD hiển thị chuyên nghiệp hơn.</span>
            <div className="mt-3 flex flex-wrap gap-2">
              <input id="company-logo-input" type="file" accept="image/*" className="hidden" onChange={onLogoFileChange} />
              <Button variant="secondary" size="sm" onClick={() => document.getElementById("company-logo-input")?.click()}>
                <ImagePlus size={15} /> Chọn ảnh
              </Button>
            </div>
          </div>
        </div>
        <Input label="Tên công ty" value={form.company} onChange={(event) => onChange("company", event.target.value)} placeholder="VD: AICareer Labs" required />
        <Input label="URL website công ty" value={form.companyWebsiteUrl} onChange={(event) => onChange("companyWebsiteUrl", event.target.value)} placeholder="VD: https://aicareer.vn" />
      </section>
    );
  }

  if (index === 1) {
    return (
      <section className="jd-book-page">
        <BookPageHeader number="02" title="Thông tin vị trí" />
        <Input label="Tên vị trí" value={form.title} onChange={(event) => onChange("title", event.target.value)} placeholder="Nhập tên vị trí" required />
        <div className="jd-book-field-grid">
          <Input label="Địa điểm" value={form.location} onChange={(event) => onChange("location", event.target.value)} placeholder="VD: Hà Nội / Hybrid" />
          <Select label="Mức lương" value={form.salary} onChange={(event) => onChange("salary", event.target.value)}>
            <option value="">Chọn mức lương</option>
            {SALARY_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Select>
        </div>
        <div className="jd-book-field-grid">
          <Select label="Hình thức" value={form.workType} onChange={(event) => onChange("workType", event.target.value)}>
            <option value="">Chọn hình thức</option>
            {WORK_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Select>
          <Select label="Kinh nghiệm" value={form.experience} onChange={(event) => onChange("experience", event.target.value)}>
            <option value="">Chọn kinh nghiệm</option>
            {EXPERIENCE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Select>
        </div>
        <Select label="Level ứng viên" value={form.level} onChange={(event) => onChange("level", event.target.value)}>
          <option value="">Chọn level ứng viên</option>
          {CANDIDATE_LEVEL_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </Select>
        <Input label="Hạn ứng tuyển" type="date" value={form.deadline} onChange={(event) => onChange("deadline", event.target.value)} />
      </section>
    );
  }

  if (index === 2) {
    return (
      <section className="jd-book-page">
        <BookPageHeader number="03" title="Nội dung JD" />
        <Textarea label="Mô tả công việc" value={form.description} onChange={(event) => onChange("description", event.target.value)} rows={5} placeholder="VD: Mô tả nhiệm vụ chính, sản phẩm, team..." required />
        <Textarea label="Yêu cầu ứng viên" value={form.requirements} onChange={(event) => onChange("requirements", event.target.value)} rows={5} placeholder="VD: Kỹ năng, kinh nghiệm, công nghệ, soft skills..." required />
        <Textarea label="Quyền lợi" value={form.benefits} onChange={(event) => onChange("benefits", event.target.value)} rows={3} placeholder="VD: Lương thưởng, bảo hiểm, đào tạo, môi trường..." />
      </section>
    );
  }

  return (
    <section className="jd-book-page review">
      <BookPageHeader number="04" title="Xem lại trước khi tạo" />
      <div className="jd-book-review-card">
        <div className="jd-company-logo-preview small">
          {logoPreview ? <img src={logoPreview} alt="Logo công ty" /> : <Building2 size={22} />}
        </div>
        <div>
          <h3>{form.title || "Chưa nhập vị trí"}</h3>
          <p>{form.company || "Chưa nhập công ty"}</p>
        </div>
      </div>
      <div className="jd-book-review-list">
        <p><strong>Địa điểm:</strong> {form.location || "Chưa cập nhật"}</p>
        <p><strong>Website:</strong> {form.companyWebsiteUrl || "Chưa cập nhật"}</p>
        <p><strong>Lương:</strong> {form.salary || "Thỏa thuận"}</p>
        <p><strong>Hình thức:</strong> {form.workType || "Full-time"}</p>
        <p><strong>Kinh nghiệm:</strong> {form.experience || "Không yêu cầu"}</p>
        <p><strong>Level ứng viên:</strong> {form.level || "Chưa cập nhật"}</p>
        <p><strong>Hạn ứng tuyển:</strong> {form.deadline || "Chưa cập nhật"}</p>
      </div>
      <div className="jd-book-note">
        Cần có ít nhất tên vị trí, công ty, mô tả công việc và yêu cầu ứng viên để tạo JD.
      </div>
      <div className="jd-book-review-actions">
        <Button variant="ghost" onClick={onReset}>
          Hoàn tác
        </Button>
        <Button type="submit" variant="primary" disabled={!canSubmit} isLoading={isSubmitting}>
          <Plus size={16} /> Xác nhận
        </Button>
      </div>
    </section>
  );
}

function BookPageHeader({ number, title }) {
  return (
    <header className="jd-book-page-head">
      <span>{number}</span>
      <h3>{title}</h3>
    </header>
  );
}

function DocumentCard({
  icon: Icon,
  tone = "blue",
  title,
  subtitle,
  meta,
  imageUrl,
  onOpen,
  onEdit,
  onDelete,
  onPublish,
  isPublishing,
}) {
  const iconClass = tone === "amber" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600";

  return (
    <div
      className="group relative cursor-pointer rounded-[14px] border p-4 transition hover:-translate-y-0.5 hover:shadow-md"
      style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen?.();
      }}
    >
      <div className="mb-4 flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] ${iconClass}`}>
          {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <Icon size={20} />}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-bold" style={{ color: "var(--text)" }} title={title}>
            {title || "Chưa có tiêu đề"}
          </h4>
          <p className="truncate text-xs" style={{ color: "var(--text-soft)" }}>
            {subtitle || "Chưa cập nhật"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs" style={{ color: "var(--text-soft)" }}>
        <span className="truncate">{meta}</span>
        <div className="flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
          {onEdit ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              className="rounded-[8px] p-1.5 text-blue-600 hover:bg-blue-50"
              title="Chỉnh sửa"
              aria-label="Chỉnh sửa"
            >
              <Pencil size={16} />
            </button>
          ) : null}
          {onPublish ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onPublish();
              }}
              className="rounded-[8px] px-2 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50"
              title="Đăng JD"
              aria-label="Đăng JD"
              disabled={isPublishing}
            >
              {isPublishing ? "..." : "Đăng cho ứng viên"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete?.();
            }}
            className="rounded-[8px] p-1.5 text-red-500 hover:bg-red-50"
            title="Xóa"
            aria-label="Xóa"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

