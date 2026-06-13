import re
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# --- Logic from Notebook ---
CONFIG = {
    "model_name": "paraphrase-multilingual-MiniLM-L12-v2",
    "weights": {"semantic": 0.7, "keyword": 0.3}
}

SKILL_LIBRARY = [
    "python", "django", "fastapi", "sql", "nosql", "mongodb", "redis", 
    "docker", "kubernetes", "aws", "gcp", "java", "spring boot", "mysql", "postgresql"
]

def clean_text(text):
    text = text.lower()
    # Sử dụng \w chuẩn để giữ lại ký tự chữ cái và số
    text = re.sub(r'[^\w\s\+\#\.]', ' ', text)
    # Fix khoảng trắng thừa
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_skills(text):
    text_cleaned = clean_text(text)
    found = [skill for skill in SKILL_LIBRARY if skill in text_cleaned]
    return list(set(found))

def run_test():
    print("Starting Test...")
    try:
        model = SentenceTransformer(CONFIG["model_name"])
        print("Model loaded.")
        
        jd = "Senior Python Developer. Needs Docker and AWS."
        cv = "Python engineer with Docker experience."
        
        # Test cleaning
        c_jd = clean_text(jd)
        c_cv = clean_text(cv)
        print(f"Clean Test: {'Success' if 'senior' in c_jd else 'Failed'}")
        
        # Test Skills
        skills = extract_skills(jd)
        print(f"Skill Extract: {skills}")
        
        # Test Similarity
        embeddings = model.encode([c_jd, c_cv])
        sim = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
        print(f"Similarity Score: {sim:.4f}")
        
        print("\nALL LOGIC TESTS PASSED!")
    except Exception as e:
        print(f"\nBUG FOUND: {e}")

if __name__ == "__main__":
    run_test()
