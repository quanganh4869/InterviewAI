import { Navigate, useLocation } from "react-router-dom";
import InterviewSessionRoomPage from "../features/interview/session/InterviewSessionRoomPage";

export default function InterviewEntryPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  if (params.get("jobPostingId") && params.get("cvDocumentId")) {
    return <InterviewSessionRoomPage />;
  }
  return <Navigate to="/luyen-tap/tao-moi" replace />;
}
