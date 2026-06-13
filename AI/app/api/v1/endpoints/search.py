import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.vector_db_service import vector_db_service

router = APIRouter()
log = logging.getLogger(__name__)

@router.get("/candidates")
async def search_candidates(
    query: str = Query(..., description="Tìm kiếm theo kỹ năng hoặc yêu cầu"),
    top_k: int = Query(5, description="Số lượng kết quả")
):
    """
    Tìm kiếm ứng viên từ Database dựa trên ngữ nghĩa (Semantic Search).
    """
    try:
        results = vector_db_service.search_candidates(query, n_results=top_k)
        return {
            "query": query,
            "total_found": len(results),
            "candidates": results
        }
    except Exception as e:
        log.error(f"Search Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-cv")
async def save_cv_to_db(
    cv_id: str,
    text: str,
    email: Optional[str] = None,
    name: Optional[str] = None
):
    """
    Lưu tay một CV vào Database để test.
    """
    metadata = {"name": name, "email": email}
    success = vector_db_service.upsert_cv(cv_id, text, metadata)
    if success:
        return {"message": f"Đã lưu CV {cv_id} thành công."}
    else:
        raise HTTPException(status_code=500, detail="Lỗi khi lưu vào DB.")
