import json

path = r'd:/Work/DATN/AI/CV_JD_Matcher_RnD.ipynb'

cells = [
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "# 🎯 AI Recruitment: CV vs JD Semantic Matcher (Advanced R&D)\n",
            "\n",
            "Notebook này phân tích chuyên sâu độ phù hợp giữa CV (File) và JD (Text) dựa trên 2 phương pháp:\n",
            "1. **Traditional Matching**: Vector Similarity + Rule-based (Fast & Efficient)\n",
            "2. **AI Deep Reasoning**: Google Gemini LLM (Smart & Context-aware)"
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "import fitz\n",
            "import pytesseract\n",
            "import os, io, re\n",
            "import pandas as pd\n",
            "import numpy as np\n",
            "import matplotlib.pyplot as plt\n",
            "import seaborn as sns\n",
            "from PIL import Image, ImageEnhance, ImageOps\n",
            "from sentence_transformers import SentenceTransformer\n",
            "from sklearn.metrics.pairwise import cosine_similarity\n",
            "\n",
            "# --- CONFIG ---\n",
            "TESS_PATH = r\"C:\\Program Files\\Tesseract-OCR\\tesseract.exe\"\n",
            "if os.path.exists(TESS_PATH):\n",
            "    pytesseract.pytesseract.tesseract_cmd = TESS_PATH\n",
            "MODEL_NAME = \"paraphrase-multilingual-MiniLM-L12-v2\"\n",
            "SKILL_LIBRARY = [\"python\", \"java\", \"javascript\", \"react\", \"node\", \"docker\", \"kubernetes\", \"aws\", \"sql\", \"nosql\", \"mongodb\", \"django\", \"fastapi\"]\n",
            "\n",
            "print(\"Loading AI Models...\")\n",
            "model = SentenceTransformer(MODEL_NAME)\n",
            "print(\"System Ready.\")"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": ["## 1. Extraction Helpers"]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "def extract_text(file_path):\n",
            "    ext = file_path.split('.')[-1].lower()\n",
            "    text = \"\"\n",
            "    if ext == 'pdf':\n",
            "        doc = fitz.open(file_path)\n",
            "        for page in doc:\n",
            "            native = page.get_text().strip()\n",
            "            if native: text += native + \"\\n\"\n",
            "            else:\n",
            "                pix = page.get_pixmap(matrix=fitz.Matrix(400/72, 400/72))\n",
            "                text += pytesseract.image_to_string(Image.open(io.BytesIO(pix.tobytes(\"png\"))), lang=\"vie+eng\")\n",
            "        doc.close()\n",
            "    return text.strip()\n",
            "\n",
            "def get_skills(text):\n",
            "    t = text.lower()\n",
            "    return [s for s in SKILL_LIBRARY if s in t]\n",
            "\n",
            "def get_exp(text):\n",
            "    matches = re.findall(r'(\\d+)\\s*(năm|year)', text.lower())\n",
            "    years = [int(m[0]) for m in matches]\n",
            "    return max(years) if years else 0"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": ["## 2. Traditional Analysis & Scoring"]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "def analyze_match(cv_text, jd_text):\n",
            "    # 1. Semantic (Vector)\n",
            "    emb = model.encode([cv_text, jd_text])\n",
            "    sem_score = cosine_similarity([emb[0]], [emb[1]])[0][0]\n",
            "    \n",
            "    # 2. Skills\n",
            "    jd_s = get_skills(jd_text)\n",
            "    cv_s = get_skills(cv_text)\n",
            "    matched = [s for s in jd_s if s in cv_s]\n",
            "    skill_score = len(matched)/len(jd_s) if jd_s else 1.0\n",
            "    \n",
            "    # 3. Exp\n",
            "    cv_e = get_exp(cv_text)\n",
            "    jd_e = get_exp(jd_text)\n",
            "    exp_score = min(cv_e/jd_e, 1.0) if jd_e > 0 else 1.0\n",
            "    \n",
            "    final = (sem_score * 0.5 + skill_score * 0.3 + exp_score * 0.2) * 100\n",
            "    return {\n",
            "        \"total\": round(final, 2),\n",
            "        \"semantic\": round(sem_score * 100, 2),\n",
            "        \"skills\": round(skill_score * 100, 2),\n",
            "        \"experience\": round(exp_score * 100, 2),\n",
            "        \"matched_list\": matched\n",
            "    }"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": ["## 3. Visualization Helpers"]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "def plot_radar(data, name):\n",
            "    labels = ['Semantic', 'Skills', 'Experience']\n",
            "    stats = [data['semantic'], data['skills'], data['experience']]\n",
            "    \n",
            "    angles = np.linspace(0, 2*np.pi, len(labels), endpoint=False).tolist()\n",
            "    stats += stats[:1]\n",
            "    angles += angles[:1]\n",
            "\n",
            "    fig, ax = plt.subplots(figsize=(4, 4), subplot_kw=dict(polar=True))\n",
            "    ax.fill(angles, stats, color='blue', alpha=0.25)\n",
            "    ax.plot(angles, stats, color='blue', linewidth=2)\n",
            "    ax.set_yticklabels([])\n",
            "    ax.set_xticks(angles[:-1])\n",
            "    ax.set_xticklabels(labels)\n",
            "    plt.title(f\"Radar Chart: {name}\")\n",
            "    plt.show()"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": ["## 4. Run Traditional Analysis"]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "JD_INPUT = \"\"\" Tuyển Python Developer, 3 năm kinh nghiệm, biết Docker, AWS và SQL. \"\"\"\n",
            "CV_FOLDER = r\"D:\\Work\\DATN\\AI\\CV\"\n",
            "\n",
            "all_res = []\n",
            "if os.path.exists(CV_FOLDER):\n",
            "    for f in os.listdir(CV_FOLDER):\n",
            "        if f.endswith('.pdf'):\n",
            "            try:\n",
            "                txt = extract_text(os.path.join(CV_FOLDER, f))\n",
            "                res = analyze_match(txt, JD_INPUT)\n",
            "                res['name'] = f\n",
            "                all_res.append(res)\n",
            "                # plot_radar(res, f) # Uncomment to see radar charts\n",
            "            except Exception as e:\n",
            "                print(f\"Error processing {f}: {e}\")\n",
            "\n",
            "    if all_res:\n",
                "        df = pd.DataFrame(all_res).sort_values('total', ascending=False)\n",
                "        plt.figure(figsize=(10, 4))\n",
                "        sns.barplot(x='total', y='name', data=df, palette='magma')\n",
                "        plt.title(\"Overall Match Scores (Traditional)\")\n",
                "        plt.show()\n",
                "        display(df[['name', 'total', 'semantic', 'skills', 'experience']])\n",
            "else:\n",
            "    print(f\"CV Folder not found at {CV_FOLDER}\")"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 5. 🤖 Advanced AI Analysis (Google Gemini)\n",
            "\n",
            "Sử dụng LLM để hiểu ngữ cảnh sâu và đưa ra đánh giá như một HR Manager chuyên nghiệp."
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "import google.generativeai as genai\n",
            "import json\n",
            "\n",
            "# --- Gemini Config ---\n",
            "# Lấy API Key tại: https://aistudio.google.com/\n",
            "GOOGLE_API_KEY = \"YOUR_API_KEY_HERE\"\n",
            "genai.configure(api_key=GOOGLE_API_KEY)\n",
            "llm_model = genai.GenerativeModel('gemini-1.5-flash')\n",
            "\n",
            "def analyze_with_llm(cv_text, jd_text):\n",
            "    prompt = f\"\"\"\n",
            "    Bạn là một Senior Technical Recruiter chuyên nghiệp.\n",
            "    Hãy đánh giá mức độ phù hợp của ứng viên dựa trên CV và JD dưới đây.\n",
            "    \n",
            "    [JD]: {jd_text}\n",
            "    [CV]: {cv_text}\n",
            "    \n",
            "    Trả về kết quả duy nhất định dạng JSON (không có text giải thích bên ngoài):\n",
            "    {{\n",
            "        \"match_score\": (0-100),\n",
            "        \"summary\": \"Tóm tắt ngắn gọn 2 câu về ứng viên\",\n",
            "        \"pros\": [\"Điểm mạnh 1\", \"Điểm mạnh 2\"],\n",
            "        \"cons\": [\"Điểm yếu 1\", \"Điểm yếu 2\"],\n",
            "        \"verdict\": \"Shortlist/Consider/Reject\",\n",
            "        \"questions\": [\"Câu hỏi phỏng vấn 1\", \"Câu hỏi phỏng vấn 2\"]\n",
            "    }}\n",
            "    \"\"\"\n",
            "    \n",
            "    try:\n",
            "        response = llm_model.generate_content(prompt)\n",
            "        clean_json = response.text.replace('```json', '').replace('```', '').strip()\n",
            "        return json.loads(clean_json)\n",
            "    except Exception as e:\n",
            "        return {\"error\": str(e)}\n",
            "\n",
            "print(\"LLM Engine Ready.\")"
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "if 'all_res' in locals() and all_res:\n",
            "    # Phân tích ứng viên có điểm cao nhất theo cách cũ\n",
            "    top_candidate = all_res[0]\n",
            "    sample_cv_path = os.path.join(CV_FOLDER, top_candidate['name'])\n",
            "    sample_cv_text = extract_text(sample_cv_path)\n",
            "    \n",
            "    print(f\"--- Phân tích chuyên sâu ứng viên: {top_candidate['name']} ---\")\n",
            "    llm_result = analyze_with_llm(sample_cv_text, JD_INPUT)\n",
            "    \n",
            "    print(f\"\\n[SO SÁNH KẾT QUẢ]\")\n",
            "    print(f\"📍 Điểm Cách Cũ (Toán học): {top_candidate['total']}% \")\n",
            "    print(f\"🚀 Điểm LLM (Tư duy AI): {llm_result.get('match_score')}% \")\n",
            "    \n",
            "    print(f\"\\n[ĐÁNH GIÁ CHI TIẾT CỦA AI]\")\n",
            "    print(f\"📝 Tóm tắt: {llm_result.get('summary')}\")\n",
            "    print(f\"✅ Ưu điểm: {', '.join(llm_result.get('pros', []))}\")\n",
            "    print(f\"❌ Nhược điểm: {', '.join(llm_result.get('cons', []))}\")\n",
            "    print(f\"⚖️ Kết luận: {llm_result.get('verdict')}\")\n",
            "    print(f\"💡 Câu hỏi phỏng vấn gợi ý: \\n- \" + '\\n- '.join(llm_result.get('questions', [])))\n",
            "else:\n",
            "    print(\"Vui lòng chạy Section 4 để có danh sách ứng viên trước.\")"
        ]
    }
]

nb = {
    "cells": cells,
    "metadata": {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3"
        },
        "language_info": {
            "name": "python",
            "version": "3.10.0"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 4
}

with open(path, 'w', encoding='utf-8') as f:
    json.dump(nb, f, indent=1)
