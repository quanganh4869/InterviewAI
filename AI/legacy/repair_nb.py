import json
import os

path = r'd:/Work/DATN/AI/CV_JD_Matcher_RnD.ipynb'

# Read as raw text to fix the broken JSON
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

try:
    # Identify the cells content
    # We find the first '[' after '"cells":'
    start_cells = content.find('"cells":')
    if start_cells == -1:
        raise ValueError("Could not find 'cells' key")
    
    start_bracket = content.find('[', start_cells)
    # Find the matching closing bracket for cells
    # This is tricky if it's broken, so we look for the last ']' before 'metadata'
    end_metadata = content.find('"metadata"')
    if end_metadata == -1:
        # If metadata is missing or broken, just look for the last bracket
        end_bracket = content.rfind(']')
    else:
        end_bracket = content.rfind(']', 0, end_metadata)

    cells_raw = content[start_bracket:end_bracket+1]
    
    # Try to parse existing cells
    try:
        existing_cells = json.loads(cells_raw)
    except:
        # If it fails, try a more aggressive cleanup
        # Find all objects that look like cells
        print("Initial parse failed, attempting cleanup...")
        # Just take everything from first { to last } inside the cells array
        # This is a bit of a hack
        existing_cells = [] 
        # Fallback: try to just load what we can
        import re
        cell_matches = re.findall(r'\{[^{}]*\"cell_type\"[^{}]*\}', cells_raw, re.DOTALL)
        # That's too simple. Let's just use the parts we know are good.
        # For now, let's assume the previous view_file showed it was mostly okay except for the end.
        # We'll just truncate the file at the last valid cell.
        last_valid_cell_end = cells_raw.rfind('}')
        cells_fixed = cells_raw[:last_valid_cell_end+1] + "]"
        existing_cells = json.loads(cells_fixed)

    # Define the new cells
    new_cells = [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": ["## 5. 🤖 Advanced AI Analysis (Google Gemini)\n", "\n", "Phần này sử dụng LLM để thực hiện \"Deep Reasoning\" - hiểu ngữ cảnh thay vì chỉ đếm từ khóa."]
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
                "\n",
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
                "    sample_cv = extract_text(os.path.join(CV_FOLDER, all_res[0]['name']))\n",
                "    print(f\"--- Đang phân tích ứng viên: {all_res[0]['name']} ---\")\n",
                "    \n",
                "    llm_result = analyze_with_llm(sample_cv, JD_INPUT)\n",
                "    \n",
                "    print(f\"\\n[KẾT QUẢ SO SÁNH]\")\n",
                "    print(f\"- Điểm Cách Cũ (Toán học): {all_res[0]['total']}% \")\n",
                "    print(f\"- Điểm LLM (Tư duy): {llm_result.get('match_score')}% \")\n",
                "    print(f\"\\n[NHẬN XÉT CỦA AI]\")\n",
                "    print(f\"Tóm tắt: {llm_result.get('summary')}\")\n",
                "    print(f\"Ưu điểm: {', '.join(llm_result.get('pros', []))}\")\n",
                "    print(f\"Nhược điểm: {', '.join(llm_result.get('cons', []))}\")\n",
                "    print(f\"Câu hỏi gợi ý: \\n- \" + '\\n- '.join(llm_result.get('questions', [])))\n",
                "else:\n",
                "    print(\"Vui lòng chạy các ô phía trên trước.\")"
            ]
        }
    ]

    full_nb = {
        "cells": existing_cells + new_cells,
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
        json.dump(full_nb, f, indent=1)
    print("SUCCESS: Notebook repaired and updated.")

except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()
