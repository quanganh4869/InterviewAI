import re
import unicodedata

def clean_text(text: str) -> str:
    """
    Clean and normalize text for better matching.
    Includes lowercase, whitespace removal, and unicode normalization.
    """
    if not text:
        return ""
    
    # Unicode normalization (NFC) - important for Vietnamese accents
    text = unicodedata.normalize('NFC', text)
    
    # Lowercase
    text = text.lower()
    
    # Replace multiple spaces/newlines with single space
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()

def extract_years_from_text(text: str) -> int:
    """
    Extract maximum years of experience mentioned in text using regex.
    """
    patterns = [
        r'(\d+)\s*(năm|year)', 
        r'(\d+)\+\s*(năm|year)',
        r'exp\D*(\d+)',
        r'experience\D*(\d+)'
    ]
    years = [0]
    cleaned = text.lower()
    for pattern in patterns:
        matches = re.findall(pattern, cleaned)
        for m in matches:
            if isinstance(m, tuple):
                years.append(int(m[0]))
            else:
                years.append(int(m))
                
    return max(years)
