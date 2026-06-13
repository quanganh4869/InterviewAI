export const JOB_POSTINGS = [
  {
    id: "JD-TCB-2026-01",
    title: "Senior IT Risk Specialist",
    company: "Techcombank",
    location: "Hà Nội",
    type: "Toàn thời gian",
    salary: "35 - 55 triệu",
    postedAt: "25/03/2026",
    summary:
      "Xây dựng khung quản trị rủi ro CNTT cho hệ thống ngân hàng số, phối hợp chặt với Security và Engineering.",
    responsibilities: [
      "Thiết kế và vận hành control framework cho hệ thống trọng yếu.",
      "Đánh giá định kỳ các rủi ro vận hành CNTT và đề xuất biện pháp giảm thiểu.",
      "Làm việc với kiểm toán nội bộ và các bộ phận compliance.",
    ],
    requirements: [
      "3+ năm kinh nghiệm IT Risk/IT Governance trong tài chính hoặc fintech.",
      "Hiểu biết về ISO 27001, COBIT hoặc NIST.",
      "Kỹ năng giao tiếp và thuyết trình tốt với stakeholder liên phòng ban.",
    ],
    cvFit: 82,
    keywordMatch: 76,
    seniorityMatch: 84,
  },
  {
    id: "JD-VPB-2026-05",
    title: "IT Audit Manager",
    company: "VPBank",
    location: "TP.HCM",
    type: "Toàn thời gian",
    salary: "40 - 60 triệu",
    postedAt: "23/03/2026",
    summary:
      "Dẫn dắt các chương trình kiểm toán CNTT và phối hợp khắc phục điểm yếu kiểm soát nội bộ.",
    responsibilities: [
      "Lập kế hoạch kiểm toán CNTT theo quý/năm.",
      "Đánh giá hiệu quả kiểm soát công nghệ và quản trị dữ liệu.",
      "Theo dõi hành động khắc phục sau kiểm toán.",
    ],
    requirements: [
      "5+ năm kinh nghiệm IT Audit/IT Control.",
      "Ưu tiên có CISA/CISM hoặc chứng chỉ tương đương.",
      "Có kinh nghiệm quản lý nhóm và trình bày báo cáo cho ban điều hành.",
    ],
    cvFit: 78,
    keywordMatch: 74,
    seniorityMatch: 88,
  },
  {
    id: "JD-VCB-2026-03",
    title: "Information Security Governance Lead",
    company: "Vietcombank",
    location: "Hà Nội",
    type: "Toàn thời gian",
    salary: "45 - 70 triệu",
    postedAt: "20/03/2026",
    summary:
      "Phụ trách governance cho mảng an toàn thông tin, bảo đảm chính sách và tuân thủ xuyên suốt khối công nghệ.",
    responsibilities: [
      "Xây dựng tiêu chuẩn và quy định bảo mật nội bộ.",
      "Theo dõi KPI/KRI bảo mật và điều phối cải tiến.",
      "Huấn luyện nhận thức bảo mật cho các đơn vị nghiệp vụ.",
    ],
    requirements: [
      "Kinh nghiệm thực tế về governance trong môi trường ngân hàng lớn.",
      "Nắm chắc quy định pháp lý liên quan an toàn thông tin.",
      "Tư duy hệ thống và kỹ năng điều phối đa bộ phận.",
    ],
    cvFit: 85,
    keywordMatch: 80,
    seniorityMatch: 87,
  },
];

export const SAMPLE_CV_ROWS = [
  {
    id: "CV-SAMPLE-001",
    name: "Nguyen_Minh_CV.pdf",
    role: "Senior Frontend",
    updatedAt: "26/03/2026",
  },
  {
    id: "CV-SAMPLE-002",
    name: "Tran_Bao_B_Resume.docx",
    role: "Frontend Engineer",
    updatedAt: "24/03/2026",
  },
];

export const HISTORY_DATA = [
  {
    id: "INT-521",
    date: "22/03/2026",
    role: "Senior Frontend Specialist",
    type: "behavioral",
    mode: "Hành vi",
    score: 88,
    verdict: "Nên tuyển mạnh",
  },
  {
    id: "INT-497",
    date: "18/03/2026",
    role: "Technical Lead",
    type: "technical",
    mode: "Kỹ thuật",
    score: 84,
    verdict: "Nên tuyển",
  },
];

export const LEGACY_SCREEN_ALIAS = {
  profileLibrary: "profileCv",
  analyticsResults: "interviewHistory",
  aiReports: "interviewHistory",
  learningProgress: "dashboardOverview",
  jobDetail: "jobMatch",
};

export function findJobPostingById(id) {
  return JOB_POSTINGS.find((job) => job.id === id);
}

export const INTERVIEW_QUESTIONS = [
  "Hãy giới thiệu ngắn gọn về bản thân và lý do bạn ứng tuyển vị trí này.",
  "Bạn đã từng quản lý rủi ro CNTT trong môi trường tài chính như thế nào? Hãy cho một ví dụ cụ thể.",
  "Mô tả một tình huống bạn phải phối hợp với nhiều bộ phận để giải quyết sự cố bảo mật.",
  "Bạn hiểu về ISO 27001 và COBIT như thế nào? Áp dụng vào thực tế ra sao?",
  "Kể về một quyết định khó khăn bạn đã đưa ra liên quan đến rủi ro và kết quả là gì?",
  "Bạn xử lý xung đột với stakeholder như thế nào khi có sự bất đồng về ưu tiên?",
  "Làm thế nào bạn đo lường hiệu quả của các biện pháp kiểm soát rủi ro?",
  "Nếu được nhận vào vị trí này, kế hoạch 90 ngày đầu tiên của bạn là gì?",
];

export const PARSE_STAGES = [
  "Trích xuất thông tin cá nhân",
  "Phân tích kinh nghiệm làm việc",
  "Đánh giá kỹ năng và năng lực",
  "Chấm điểm tín hiệu phù hợp vị trí",
  "Tổng hợp hồ sơ và gợi ý",
];

export const READINESS_BARS = [62, 71, 68, 79, 75, 83, 82];

export const PROGRESS_LINE = [65, 72, 70, 78, 80, 84, 82, 88];
