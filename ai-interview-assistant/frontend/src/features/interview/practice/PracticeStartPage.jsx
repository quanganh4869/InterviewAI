import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import { MainLayout } from "../../../components/layout";
import { Button, SectionCard, StatusBadge } from "../../../components/ui";
import { createInterviewSession } from "../../../api";
import "../../aiInterview/legacy.css";

export default function PracticeStartPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    target_role: "",
    focus: "General interview",
    level: "General",
    language: "vi",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const start = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const session = await createInterviewSession({
        sessionType: "practice",
        practiceConfig: form,
      });
      navigate(`/luyen-tap/${session.id}/phong`);
    } catch (err) {
      setError(err?.message || "Không thể tạo phiên luyện tập.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="interview-legacy grid gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="role-hero">
          <div className="role-hero-content">
            <div>
              <StatusBadge status="reviewing">Luyện tập</StatusBadge>
              <h2>Tạo phiên luyện tập</h2>
              <p>Phiên luyện tập được lưu vào cơ sở dữ liệu và dùng chung bản ghi lời nói, đánh giá với phỏng vấn chính thức.</p>
            </div>
          </div>
        </header>

        <SectionCard title="Cau hinh ngan">
          <form className="grid gap-4" onSubmit={start}>
            {error ? (
              <p className="rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                {error}
              </p>
            ) : null}
            <label className="grid gap-2 text-sm font-bold">
              Vị trí mục tiêu
              <input
                className="input-field"
                value={form.target_role}
                onChange={(event) => update("target_role", event.target.value)}
                placeholder="Backend Developer, Data Analyst..."
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Trọng tâm luyện tập
              <select
                className="input-field"
                value={form.focus}
                onChange={(event) => update("focus", event.target.value)}
              >
                <option value="General interview">Phỏng vấn tổng quát</option>
                <option value="Technical interview">Phỏng vấn kỹ thuật</option>
                <option value="Behavioral interview">Phỏng vấn hành vi</option>
                <option value="HR screening">HR screening</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Level
              <select
                className="input-field"
                value={form.level}
                onChange={(event) => update("level", event.target.value)}
              >
                <option value="Intern">Intern</option>
                <option value="Junior">Junior</option>
                <option value="Middle">Middle</option>
                <option value="Senior">Senior</option>
                <option value="General">General</option>
              </select>
            </label>
            <Button type="submit" isLoading={isSubmitting} className="w-fit">
              <Play size={16} /> Bắt đầu luyện tập
            </Button>
          </form>
        </SectionCard>
      </div>
    </MainLayout>
  );
}
