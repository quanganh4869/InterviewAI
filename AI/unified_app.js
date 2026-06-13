/**
 * Unified AI Dashboard Logic - Enterprise Version
 */

const CONFIG = {
    STT_API: 'http://localhost:8001/api/v1/stt/transcribe',
    OCR_API: 'http://localhost:8001/api/v1/extract/',
    MATCHER_API: 'http://localhost:8001/api/v1/ai/match'
};

// Global chart instance
let matcherChart = null;

// --- Navigation Logic ---
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const pageId = item.getAttribute('data-page');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${pageId}`).classList.add('active');
    });
});

// --- Speech to Text (Whisper) Logic ---
const sttStartBtn = document.getElementById('stt-start-btn');
const sttStopBtn = document.getElementById('stt-stop-btn');
const sttStatus = document.getElementById('stt-status');
const sttResultText = document.getElementById('stt-result-text');
const sttLoader = document.getElementById('stt-loader');

let mediaRecorder;
let audioChunks = [];

if (sttStartBtn) {
    sttStartBtn.onclick = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await sendToSttBackend(audioBlob);
        };

        mediaRecorder.start();
        sttStartBtn.disabled = true;
        sttStopBtn.disabled = false;
        sttStatus.style.display = 'inline-flex';
    };

    sttStopBtn.onclick = () => {
        mediaRecorder.stop();
        sttStartBtn.disabled = false;
        sttStopBtn.disabled = true;
        sttStatus.style.display = 'none';
    };
}

async function sendToSttBackend(blob) {
    sttLoader.style.display = 'block';
    sttResultText.innerText = "Đang nhận diện giọng nói...";
    
    const fd = new FormData();
    fd.append('file', blob, 'recording.webm');
    
    try {
        const res = await fetch(CONFIG.STT_API, { method: 'POST', body: fd });
        const data = await res.json();
        sttResultText.innerText = data.text || "(Không nhận diện được nội dung)";
    } catch (err) { 
        sttResultText.innerText = "Lỗi kết nối Server STT. Vui lòng kiểm tra main.py"; 
    } finally {
        sttLoader.style.display = 'none';
    }
}

// --- CV vs JD Matcher Logic ---
let cvFile = null;
let jdFile = null;

const cvInput = document.getElementById('matcher-cv-file');
const jdInput = document.getElementById('matcher-jd-file');
const matcherBtn = document.getElementById('matcher-btn');

if (matcherBtn) {
    document.getElementById('matcher-cv-drop-zone').addEventListener('click', () => cvInput.click());
    document.getElementById('matcher-jd-drop-zone').addEventListener('click', () => jdInput.click());

    cvInput.addEventListener('change', (e) => handleMatcherFileSelect(e.target.files[0], 'cv'));
    jdInput.addEventListener('change', (e) => handleMatcherFileSelect(e.target.files[0], 'jd'));

    function handleMatcherFileSelect(file, type) {
        if (!file) return;
        const infoId = type === 'cv' ? 'cv-file-info' : 'jd-file-info';
        if (type === 'cv') cvFile = file; else jdFile = file;
        const infoBar = document.getElementById(infoId);
        infoBar.style.display = 'flex';
        infoBar.querySelector('.file-name').innerText = file.name;
    }

    matcherBtn.addEventListener('click', async () => {
        const cvText = document.getElementById('matcher-cv-text').value;
        const jdText = document.getElementById('matcher-jd-text').value;

        if (!cvFile && !cvText.trim()) return alert("Vui lòng nhập/tải lên CV.");
        if (!jdFile && !jdText.trim()) return alert("Vui lòng nhập/tải lên JD.");

        matcherBtn.disabled = true;
        matcherBtn.innerText = "Đang phân tích...";
        document.getElementById('matcher-results').style.display = 'none';

        const fd = new FormData();
        if (cvFile) fd.append('cv_file', cvFile);
        if (cvText.trim()) fd.append('cv_text', cvText);
        if (jdFile) fd.append('jd_file', jdFile);
        if (jdText.trim()) fd.append('jd_text', jdText);

        try {
            const res = await fetch(CONFIG.MATCHER_API, { method: 'POST', body: fd });
            const data = await res.json();
            renderMatcherResults(data);
        } catch (err) { alert("Lỗi kết nối AI Matcher."); }
        finally {
            matcherBtn.disabled = false;
            matcherBtn.innerText = "Phân tích & So sánh";
        }
    });
}

function renderMatcherResults(d) {
    const results = document.getElementById('matcher-results');
    results.style.display = 'block';

    document.getElementById('matcher-score').innerText = Math.round(d.match_score);
    const statusBadge = document.getElementById('matcher-status');
    statusBadge.innerText = d.recommendation;
    
    let statusClass = 'status-badge';
    if (d.match_score >= 75) statusClass += ' status-recording';
    else if (d.match_score < 40) statusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
    statusBadge.className = statusClass;

    document.getElementById('matcher-summary').innerHTML = `
        <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; border-left: 4px solid var(--primary-light); margin-top: 10px;">
            <p style="font-size: 1rem; color: var(--text); line-height: 1.5;">${d.evaluation || 'Không có nhận xét.'}</p>
        </div>
    `;

    document.getElementById('matcher-matched-skills').innerHTML = (d.matched_skills || []).map(s => `<span class="skill-badge skill-matched">${s}</span>`).join('') || 'Trống';
    document.getElementById('matcher-missing-skills').innerHTML = (d.missing_skills || []).map(s => `<span class="skill-badge skill-missing">${s}</span>`).join('') || 'Trống';

    // --- Render Radar Chart ---
    const ctx = document.getElementById('matcher-chart').getContext('2d');
    if (matcherChart) matcherChart.destroy();
    
    matcherChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Semantic', 'Skills', 'Experience'],
            datasets: [{
                label: 'Candidate Match %',
                data: [d.semantic_score, d.skill_score, d.experience_score],
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: '#818cf8',
                borderWidth: 2,
                pointBackgroundColor: '#818cf8'
            }]
        },
        options: {
            scales: {
                r: {
                    angleLines: { color: 'rgba(255,255,255,0.1)' },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    pointLabels: { color: '#94a3b8', font: { size: 10 } },
                    ticks: { display: false, stepSize: 20 },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            plugins: { legend: { display: false } }
        }
    });

    // Preview Extracted Text
    const existingPreview = results.querySelector('.preview-box');
    if (existingPreview) existingPreview.remove();
    const previewDiv = document.createElement('div');
    previewDiv.className = 'preview-box';
    previewDiv.innerHTML = `
        <div style="margin-top: 2rem; border-top: 1px solid var(--border); padding-top: 1.5rem;">
            <h4 style="font-size: 0.9rem; margin-bottom: 1rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Văn bản AI đã trích xuất</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                <div class="card" style="padding: 1rem; background: rgba(0,0,0,0.2); font-size: 0.75rem;">
                    <div style="color: var(--primary-light); margin-bottom: 8px; font-weight: 700;">[CV CONTENT]</div>
                    <div style="max-height: 200px; overflow-y: auto; line-height: 1.6; color: #cbd5e1;">${(d.previews && d.previews.cv) || 'N/A'}</div>
                </div>
                <div class="card" style="padding: 1rem; background: rgba(0,0,0,0.2); font-size: 0.75rem;">
                    <div style="color: var(--secondary); margin-bottom: 8px; font-weight: 700;">[JD CONTENT]</div>
                    <div style="max-height: 200px; overflow-y: auto; line-height: 1.6; color: #cbd5e1;">${(d.previews && d.previews.jd) || 'N/A'}</div>
                </div>
            </div>
        </div>
    `;
    results.querySelector('.card').appendChild(previewDiv);
    results.scrollIntoView({ behavior: 'smooth' });
}

// --- OCR Logic ---
const ocrInput = document.getElementById('ocr-file-input');
const ocrExtractBtn = document.getElementById('ocr-extract-btn');
if (ocrExtractBtn) {
    ocrExtractBtn.addEventListener('click', async () => {
        const file = ocrInput.files[0];
        if (!file) return;
        ocrExtractBtn.disabled = true;
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await fetch(CONFIG.OCR_API, { method: 'POST', body: fd });
            const data = await res.json();
            document.getElementById('ocr-results').style.display = 'block';
            document.getElementById('ocr-text-result').innerText = data.text || "(Không có nội dung)";
        } catch (err) { alert("Lỗi OCR."); }
        finally { ocrExtractBtn.disabled = false; }
    });
}
