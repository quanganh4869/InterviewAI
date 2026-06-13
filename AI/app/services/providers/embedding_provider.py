import logging
import torch
from sentence_transformers import SentenceTransformer
from app.core.config import settings

log = logging.getLogger(__name__)

class EmbeddingProvider:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingProvider, cls).__new__(cls)
            cls._instance._model = None
        return cls._instance

    @property
    def model(self):
        """Lazy load the model only when accessed for the first time."""
        if self._model is None:
            log.info(f"Loading Embedding Model: {settings.EMBEDDING_MODEL_NAME}...")
            device = "cuda" if torch.cuda.is_available() else "cpu"
            self._model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME, device=device)
            log.info("Embedding Model loaded successfully.")
        return self._model

    def encode(self, texts: list):
        return self.model.encode(texts)

# Global instance
embedding_provider = EmbeddingProvider()
