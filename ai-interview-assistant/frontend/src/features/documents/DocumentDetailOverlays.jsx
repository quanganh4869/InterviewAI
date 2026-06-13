import { CvDetailWindow, JdDetailWindow } from "../aiInterview/components/modals";

export function DocumentDetailOverlays({
  selectedCvDetail,
  selectedJdDetail,
  onCloseCv,
  onCloseJd,
}) {
  return (
    <>
      {selectedCvDetail ? (
        <div
          className="interview-legacy fixed inset-0 z-[120] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-md"
          onClick={onCloseCv}
        >
          <CvDetailWindow selectedCv={selectedCvDetail} onClose={onCloseCv} />
        </div>
      ) : null}

      {selectedJdDetail ? (
        <div
          className="interview-legacy fixed inset-0 z-[120] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-md"
          onClick={onCloseJd}
        >
          <JdDetailWindow selectedJd={selectedJdDetail} onClose={onCloseJd} />
        </div>
      ) : null}
    </>
  );
}
