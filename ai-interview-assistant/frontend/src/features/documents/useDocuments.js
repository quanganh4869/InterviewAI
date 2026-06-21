import { useEffect, useState } from "react";
import {
  createDocumentDownloadUrl,
  deleteDocument,
  fetchMyDocuments,
  matchCvWithJdText,
  parseCvDocument,
  updateDocument,
  uploadCvDocument,
  uploadJdDocument,
} from "../../api";
import { dispatchNotice } from "../../utils/notice";
import { getUploadErrorMessage, mapCvRow, mapJdRow } from "./documentMappers";

export function useDocuments(user) {
  const [cvRows, setCvRows] = useState([]);
  const [jdRows, setJdRows] = useState([]);
  const [selectedCvDetail, setSelectedCvDetail] = useState(null);
  const [selectedJdDetail, setSelectedJdDetail] = useState(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [activeOperation, setActiveOperation] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingDocument, setDeletingDocument] = useState(false);
  const [editDocument, setEditDocument] = useState(null);
  const [savingDocument, setSavingDocument] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    const loadDocuments = async () => {
      setIsLoadingDocuments(true);
      try {
        const [cvDocs, jdDocs] = await Promise.all([
          fetchMyDocuments({ documentType: "cv" }),
          fetchMyDocuments({ documentType: "jd" }),
        ]);
        if (cancelled) return;
        setCvRows((cvDocs || []).map(mapCvRow));
        setJdRows((jdDocs || []).map(mapJdRow));
      } catch (error) {
        if (cancelled) return;
        dispatchNotice({
          tone: "warning",
          title: "Documents",
          message: error.message || "Cannot load documents.",
        });
      } finally {
        if (!cancelled) setIsLoadingDocuments(false);
      }
    };

    loadDocuments();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const uploadCv = async (file) => {
    if (!(file instanceof File)) {
      dispatchNotice({ tone: "warning", title: "CV", message: "Please select a CV file." });
      return false;
    }

    setActiveOperation("Dang tai CV len...");
    try {
      const result = await uploadCvDocument({ file });
      const newRow = mapCvRow(result);
      newRow.updatedAt = "Just now";
      setCvRows((prev) => [newRow, ...prev]);
      dispatchNotice({ tone: "success", title: "CV", message: "CV uploaded." });
      return true;
    } catch (error) {
      dispatchNotice({
        tone: "danger",
        title: "CV",
        message: getUploadErrorMessage(error, "cv", user?.role),
      });
      return false;
    } finally {
      setActiveOperation("");
    }
  };

  const uploadJd = async (input) => {
    const file = input instanceof File ? input : input?.file;
    if (!(file instanceof File)) {
      dispatchNotice({ tone: "warning", title: "JD", message: "Please select a JD file." });
      return false;
    }

    const fallbackTitle = (file.name || "JD").replace(/\.[^.]+$/, "").trim();
    const title = input instanceof File ? fallbackTitle : input?.title || fallbackTitle;
    const company = input instanceof File ? "" : input?.company || "";
    const summary = input instanceof File ? "" : input?.summary || "";
    setActiveOperation("Dang tai JD len...");
    try {
      const result = await uploadJdDocument({
        file,
        title: title || "JD",
        company,
        summary,
      });
      const newRow = mapJdRow(result);
      newRow.postedAt = "Just now";
      setJdRows((prev) => [newRow, ...prev]);
      dispatchNotice({ tone: "success", title: "JD", message: "JD uploaded." });
      return true;
    } catch (error) {
      dispatchNotice({
        tone: "danger",
        title: "JD",
        message: getUploadErrorMessage(error, "jd", user?.role),
      });
      return false;
    } finally {
      setActiveOperation("");
    }
  };

  const openCvDetail = async (cvId, cvData) => {
    const selected = cvData || cvRows.find((item) => item.id === cvId);
    if (!selected) return;
    setSelectedCvDetail({
      ...selected,
      cvParseStatus: "loading",
      cvParseData: null,
      cvParseError: "",
    });

    const [accessResult, parseResult] = await Promise.allSettled([
      createDocumentDownloadUrl({ documentId: selected.id }),
      parseCvDocument({ documentId: selected.id }),
    ]);

    if (accessResult.status === "fulfilled") {
      const access = accessResult.value;
      setSelectedCvDetail((prev) =>
        prev?.id === selected.id ? { ...prev, cvPdf: access.download_url } : prev,
      );
    } else {
      dispatchNotice({
        tone: "warning",
        title: "CV",
        message: accessResult.reason?.message || "Cannot create CV access link.",
      });
    }

    if (parseResult.status === "fulfilled") {
      const parsed = parseResult.value;
      setSelectedCvDetail((prev) =>
        prev?.id === selected.id
          ? { ...prev, cvParseStatus: "success", cvParseData: parsed, cvParseError: "" }
          : prev,
      );
      return;
    }

    setSelectedCvDetail((prev) =>
      prev?.id === selected.id
        ? {
            ...prev,
            cvParseStatus: "error",
            cvParseData: null,
            cvParseError: parseResult.reason?.message || "Cannot parse CV.",
          }
        : prev,
    );
  };

  const openJdDetail = async (jdId) => {
    const selected = jdRows.find((item) => item.id === jdId);
    if (!selected) return;
    setSelectedJdDetail(selected);

    try {
      const access = await createDocumentDownloadUrl({ documentId: selected.id });
      setSelectedJdDetail((prev) =>
        prev?.id === selected.id ? { ...prev, downloadUrl: access.download_url } : prev,
      );
    } catch (error) {
      dispatchNotice({
        tone: "warning",
        title: "JD",
        message: error.message || "Cannot create JD access link.",
      });
    }
  };

  const requestDeleteCv = (cvId) => {
    const selected = cvRows.find((item) => item.id === cvId);
    if (!selected) return;
    setDeleteConfirm({
      documentId: cvId,
      documentType: "cv",
      documentName: selected.name || selected.fileName || `CV #${cvId}`,
    });
  };

  const requestDeleteJd = (jdId) => {
    const selected = jdRows.find((item) => item.id === jdId);
    if (!selected) return;
    setDeleteConfirm({
      documentId: jdId,
      documentType: "jd",
      documentName: selected.title || selected.fileName || `JD #${jdId}`,
    });
  };

  const editCv = (cv) => {
    setEditDocument({
      documentType: "cv",
      documentId: cv.id,
      fileName: cv.fileName || cv.name || "",
      targetRole: cv.role === "N/A" ? "" : cv.role || "",
    });
  };

  const editJd = (jd) => {
    setEditDocument({
      documentType: "jd",
      documentId: jd.id,
      fileName: jd.fileName || "",
      title: jd.title || "",
      company: jd.company === "N/A" ? "" : jd.company || "",
      summary: jd.summary || "",
    });
  };

  const saveDocumentEdit = async () => {
    if (!editDocument?.documentId) return;

    const isCv = editDocument.documentType === "cv";
    const payload = isCv
      ? { file_name: editDocument.fileName, target_role: editDocument.targetRole }
      : {
          file_name: editDocument.fileName,
          title: editDocument.title,
          company: editDocument.company,
          summary: editDocument.summary,
        };

    setActiveOperation("Dang luu thay doi tai lieu...");
    try {
      setSavingDocument(true);
      const updated = await updateDocument({ documentId: editDocument.documentId, payload });
      if (isCv) {
        const mapped = mapCvRow(updated);
        setCvRows((prev) => prev.map((item) => (item.id === mapped.id ? mapped : item)));
      } else {
        const mapped = mapJdRow(updated);
        setJdRows((prev) => prev.map((item) => (item.id === mapped.id ? mapped : item)));
      }
      setEditDocument(null);
      dispatchNotice({ tone: "success", title: "Document", message: "Document updated." });
    } catch (error) {
      dispatchNotice({
        tone: "danger",
        title: "Document",
        message: error?.message || "Cannot update document.",
      });
    } finally {
      setSavingDocument(false);
      setActiveOperation("");
    }
  };

  const compareCvJd = async ({ cvDocumentId, jdText }) => {
    try {
      return await matchCvWithJdText({ cvDocumentId, jdText });
    } catch (error) {
      dispatchNotice({
        tone: "danger",
        title: "CV/JD Match",
        message: error?.message || "Cannot calculate CV/JD match.",
      });
      throw error;
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm?.documentId) return;
    const { documentId, documentType } = deleteConfirm;

    setActiveOperation(`Dang xoa ${documentType.toUpperCase()}...`);
    try {
      setDeletingDocument(true);
      await deleteDocument({ documentId });

      if (documentType === "cv") {
        setCvRows((prev) => prev.filter((item) => item.id !== documentId));
        setSelectedCvDetail((prev) => (prev?.id === documentId ? null : prev));
      } else {
        setJdRows((prev) => prev.filter((item) => item.id !== documentId));
        setSelectedJdDetail((prev) => (prev?.id === documentId ? null : prev));
      }

      dispatchNotice({
        tone: "success",
        title: documentType.toUpperCase(),
        message: `${documentType.toUpperCase()} deleted.`,
      });
      setDeleteConfirm(null);
    } catch (error) {
      dispatchNotice({
        tone: "danger",
        title: documentType.toUpperCase(),
        message: error.message || `Cannot delete ${documentType.toUpperCase()}.`,
      });
    } finally {
      setDeletingDocument(false);
      setActiveOperation("");
    }
  };

  return {
    cvRows,
    jdRows,
    isLoadingDocuments,
    activeOperation,
    selectedCvDetail,
    selectedJdDetail,
    deleteConfirm,
    deletingDocument,
    editDocument,
    savingDocument,
    setSelectedCvDetail,
    setSelectedJdDetail,
    setDeleteConfirm,
    setEditDocument,
    uploadCv,
    uploadJd,
    openCvDetail,
    openJdDetail,
    requestDeleteCv,
    requestDeleteJd,
    editCv,
    editJd,
    saveDocumentEdit,
    compareCvJd,
    confirmDelete,
  };
}
