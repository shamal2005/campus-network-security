from .detection import router as detection_router
from .incidents import router as incidents_router
from .settings import router as settings_router

__all__ = ["detection_router", "incidents_router", "settings_router"]
