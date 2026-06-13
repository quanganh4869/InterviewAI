import json
import os

path = r'd:/Work/DATN/AI/CV_JD_Matcher_RnD.ipynb'

with open(path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

search_demo_cell = [
    {
        'cell_type': 'markdown',
        'metadata': {},
        'source': [
            '## 6. 🔍 Semantic Search Demo\n',
            '\n',
            'Giả lập tính năng tìm kiếm ứng viên trong kho dữ liệu (Database) sử dụng Vector Embeddings.'
        ]
    },
    {
        'cell_type': 'code',
        'execution_count': None,
        'metadata': {},
        'outputs': [],
        'source': [
            '# Giả lập Database ứng viên\n',
            'candidates = [\n',
            '    {"name": "Nguyễn Văn A", "summary": "Chuyên gia Python, AI, Machine Learning với 5 năm kinh nghiệm."},\n',
            '    {"name": "Trần Thị B", "summary": "Frontend Developer chuyên ReactJS, VueJS và thiết kế UI/UX."},\n',
            '    {"name": "Lê Văn C", "summary": "Data Engineer chuyên về Big Data, Hadoop, Spark và SQL."},\n',
            '    {"name": "Phạm Văn D", "summary": "Backend Developer chuyên Java Spring Boot và Microservices."}\n',
            ']\n',
            '\n',
            'def semantic_search(query, top_k=2):\n',
            '    print(f"--- Đang tìm kiếm: \\"{query}\\\" ---\\n")\n',
            '    \n',
            '    # 1. Chuyển Query và Database sang Vector\n',
            '    candidate_texts = [c["summary"] for c in candidates]\n',
            '    candidate_embeddings = model.encode(candidate_texts)\n',
            '    query_embedding = model.encode([query])\n',
            '    \n',
            '    # 2. Tính toán độ tương đồng (Cosine Similarity)\n',
            '    similarities = cosine_similarity(query_embedding, candidate_embeddings)[0]\n',
            '    \n',
            '    # 3. Sắp xếp kết quả\n',
            '    results = []\n',
            '    for i, score in enumerate(similarities):\n',
            '        results.append({"candidate": candidates[i], "score": round(float(score) * 100, 2)})\n',
            '    \n',
            '    results = sorted(results, key=lambda x: x["score"], reverse=True)\n',
            '    \n',
            '    for i, res in enumerate(results[:top_k]):\n',
            '        print(f"{i+1}. {res[\"candidate\"][\"name\"]} - Độ phù hợp: {res[\"score\"]}%")\n',
            '        print(f"   Mô tả: {res[\"candidate\"][\"summary\"]}\\n")\n',
            '\n',
            '# --- TEST DEMO ---\n',
            'semantic_search("Tôi cần một người biết làm trí tuệ nhân tạo")\n',
            'print("-" * 50)\n',
            'semantic_search("Tìm lập trình viên làm giao diện người dùng")'
        ]
    }
]

# Avoid duplicate append
has_search = False
for cell in nb['cells']:
    source = "".join(cell.get('source', []))
    if "6. 🔍 Semantic Search Demo" in source:
        has_search = True
        break

if not has_search:
    nb['cells'].extend(search_demo_cell)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(nb, f, indent=1)
    print("Successfully added Semantic Search demo.")
else:
    print("Semantic Search demo already exists.")
