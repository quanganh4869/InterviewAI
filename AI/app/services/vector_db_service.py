import logging
import os
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.core.config import settings
from app.services.providers.embedding_provider import embedding_provider

log = logging.getLogger(__name__)

class VectorDBService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(VectorDBService, cls).__new__(cls)
            cls._instance._client = None
            cls._instance._collection = None
        return cls._instance

    @property
    def client(self):
        if self._client is None:
            db_path = os.path.abspath(settings.CHROMA_DB_PATH)
            if not os.path.exists(db_path):
                os.makedirs(db_path, exist_ok=True)
            
            log.info(f"Initializing ChromaDB at {db_path}")
            self._client = chromadb.PersistentClient(path=db_path)
        return self._client

    @property
    def collection(self):
        if self._collection is None:
            self._collection = self.client.get_or_create_collection(
                name="cv_collection",
                metadata={"hnsw:space": "cosine"}
            )
        return self._collection

    def upsert_cv(self, cv_id: str, text: str, metadata: dict):
        """Save or update a CV in the vector database."""
        try:
            embedding = embedding_provider.encode([text])[0].tolist()
            self.collection.upsert(
                ids=[cv_id],
                embeddings=[embedding],
                documents=[text],
                metadatas=[metadata]
            )
            log.info(f"Successfully saved CV {cv_id} to Vector DB.")
            return True
        except Exception as e:
            log.error(f"Error saving to Vector DB: {e}")
            return False

    def search_candidates(self, query_text: str, n_results: int = 5):
        """Search for the most relevant candidates for a given query/JD."""
        try:
            query_embedding = embedding_provider.encode([query_text])[0].tolist()
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results
            )
            
            # Format results
            candidates = []
            if results['ids']:
                for i in range(len(results['ids'][0])):
                    candidates.append({
                        "id": results['ids'][0][i],
                        "text_preview": results['documents'][0][i][:200] + "...",
                        "metadata": results['metadatas'][0][i],
                        "distance": results['distances'][0][i],
                        "score": round((1 - results['distances'][0][i]) * 100, 2)
                    })
            return candidates
        except Exception as e:
            log.error(f"Error searching Vector DB: {e}")
            return []

vector_db_service = VectorDBService()
