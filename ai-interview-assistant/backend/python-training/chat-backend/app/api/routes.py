from api.admin_api import router as admin_router
from api.cv_jd_analysis_api import router as cv_jd_analysis_router
from api.document_api import router as document_router
from api.health_check import router as health_check_router
from api.hr_email_api import router as hr_email_router
from api.interview_session_api import router as interview_session_router
from api.job_posting_api import router as job_posting_router
from api.oauth_api import router as oauth_router
from api.user_api import router as user_router
from core.api_version_router import VersionedAPIRouter

router = VersionedAPIRouter()

router.include_router(health_check_router, tags=["health-check"])
router.include_router(oauth_router, prefix="/auth", tags=["OAuth"])
router.include_router(user_router, prefix="/user", tags=["User"])
router.include_router(admin_router, prefix="/admin", tags=["Admin"])
router.include_router(
    cv_jd_analysis_router,
    prefix="/cv-jd-analysis",
    tags=["CV/JD Analysis"],
)
router.include_router(document_router, prefix="/document", tags=["Document"])
router.include_router(hr_email_router, prefix="/hr", tags=["HR Email"])
router.include_router(job_posting_router, prefix="/job-postings", tags=["Job Postings"])
router.include_router(
    interview_session_router,
    prefix="/interview-sessions",
    tags=["Interview Sessions"],
)
