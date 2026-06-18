import base64
import binascii


def load_pem_from_env(raw_value: str | bytes = "", base64_value: str | bytes = "") -> bytes | None:
    if isinstance(raw_value, bytes):
        raw_bytes = raw_value.strip()
        if raw_bytes:
            return raw_bytes
        raw_value = ""

    if isinstance(base64_value, bytes):
        base64_value = base64_value.decode("utf-8")

    encoded = (base64_value or "").strip()
    if encoded:
        try:
            return base64.b64decode(encoded, validate=True)
        except binascii.Error as exc:
            raise ValueError("Invalid base64-encoded RSA key.") from exc

    raw = (raw_value or "").strip()
    if not raw:
        return None

    return raw.replace("\\n", "\n").encode("utf-8")
