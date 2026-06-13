from app.utils.text_helper import clean_text

# Bộ từ điển kỹ năng mở rộng
TECH_STACK_LIBRARY = [
    # Languages
    "python", "java", "javascript", "typescript", "golang", "ruby", "php", "c++", "c#", "rust", "swift", "kotlin",
    # Frameworks
    "fastapi", "django", "flask", "spring boot", "react", "angular", "vue", "next.js", "nest.js", "laravel",
    # Databases
    "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "oracle", "sql server",
    # Cloud & DevOps
    "aws", "gcp", "azure", "docker", "kubernetes", "jenkins", "terraform", "ansible", "linux", "git",
    # AI & Data
    "pytorch", "tensorflow", "scikit-learn", "pandas", "numpy", "opencv", "llm", "nlp", "computer vision",
    # Soft skills & others
    "agile", "scrum", "english", "japanese", "teamwork", "leadership"
]

def extract_skills(text: str) -> list[str]:
    cleaned = clean_text(text)
    # Tìm kiếm chính xác các keyword trong văn bản đã làm sạch
    found_skills = []
    for skill in TECH_STACK_LIBRARY:
        # Sử dụng regex để tránh bắt nhầm (ví dụ 'java' trong 'javascript')
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, cleaned):
            found_skills.append(skill)
            
    return list(set(found_skills))

import re # Đảm bảo import re
