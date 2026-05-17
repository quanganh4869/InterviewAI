import hashlib
import re
import unicodedata


class EmbeddingProvider:
    """A lightweight hash-based embedding provider (no ML runtime dependency)."""

    VECTOR_SIZE = 512
    TOKEN_RE = re.compile(r"\w+")

    @classmethod
    def _normalize(cls, text: str) -> str:
        normalized = unicodedata.normalize("NFC", text or "").lower()
        return " ".join(normalized.split())

    @classmethod
    def _tokenize(cls, text: str) -> list[str]:
        return cls.TOKEN_RE.findall(text)

    @classmethod
    def _hash_index(cls, token: str) -> int:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        return int.from_bytes(digest[:8], "big") % cls.VECTOR_SIZE

    def _encode_one(self, text: str) -> list[float]:
        vector = [0.0] * self.VECTOR_SIZE
        for token in self._tokenize(self._normalize(text)):
            vector[self._hash_index(token)] += 1.0
        return vector

    def encode(self, texts: list[str]) -> list[list[float]]:
        return [self._encode_one(text) for text in texts]


embedding_provider = EmbeddingProvider()
