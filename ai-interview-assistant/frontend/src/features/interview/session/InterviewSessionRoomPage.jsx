import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bot, BriefcaseBusiness, CheckCircle2, Loader2, MessageSquare, Mic, MicOff, Square, Video, VideoOff, Volume2 } from "lucide-react";
import {
  createInterviewSession,
  deleteInterviewSession,
  fetchInterviewReport,
  fetchInterviewSession,
  finishInterviewSession,
  generateInterviewQuestions,
  uploadInterviewAnswer,
} from "../../../api";
import { Button, EmptyState, SectionCard, StatusBadge } from "../../../components/ui";
import "../../aiInterview/legacy.css";
import HrAvatar2D from "./components/HrAvatar2D";

function AudioWaveform({ activityLevel, isRecording }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set display size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;
    
    const drawWave = (phaseShift, amplitudeMultiplier, color, lineWidth) => {
      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;
      
      ctx.beginPath();
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;

      // Base amplitude scales with activityLevel (0 to 100)
      const baseAmp = (activityLevel / 100) * (height * 0.4);
      
      for (let x = 0; x < width; x++) {
        // Normalize X coordinate to 0-1 range for sine computation
        const normalizedX = x / width;
        
        // Fade out waves near the edges using a sine envelope
        const envelope = Math.sin(normalizedX * Math.PI);
        
        // Sine wave calculations
        const angle = normalizedX * Math.PI * 3.5 + phase + phaseShift;
        const y = midY + Math.sin(angle) * baseAmp * amplitudeMultiplier * envelope;
        
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!isRecording) {
        // Flat line when not recording
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.strokeStyle = "rgba(16, 185, 129, 0.2)";
        ctx.lineWidth = 3 * window.devicePixelRatio;
        ctx.stroke();
      } else {
        phase += 0.15;
        
        // Draw 3 layers of waves with different phases, amplitudes, and colors
        drawWave(0, 0.9, "rgba(16, 185, 129, 0.8)", 3 * window.devicePixelRatio); // Main Emerald wave
        drawWave(Math.PI / 2, 0.5, "rgba(56, 189, 248, 0.5)", 2 * window.devicePixelRatio); // Sky Blue wave
        drawWave(-Math.PI / 4, 0.3, "rgba(99, 102, 241, 0.3)", 1.5 * window.devicePixelRatio); // Indigo wave
      }
      
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, activityLevel]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute bottom-0 left-0 w-full h-24 pointer-events-none z-10" 
      style={{ opacity: 0.8 }}
    />
  );
}

function useQuery() {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.search), [location.search]);
}

function buildBlob(chunks, fallbackType) {
  return chunks.length ? new Blob(chunks, { type: chunks[0]?.type || fallbackType }) : null;
}

function resultPath(session) {
  return session?.session_type === "practice"
    ? `/luyen-tap/${session.id}/ket-qua`
    : `/phong-van/${session.id}/ket-qua`;
}

function displayStatus(status) {
  const labels = {
    created: "Đã tạo",
    questions_generated: "Sẵn sàng phỏng vấn",
    in_progress: "Đang phỏng vấn",
    submitted: "Đã nộp",
    transcribing: "Đang chuyển giọng nói",
    evaluating: "Đang đánh giá",
    completed: "Hoàn tất",
    failed: "Thất bại",
  };
  return labels[status] || status || "Sẵn sàng";
}

function getSupportedMimeType(type) {
  if (typeof window === "undefined" || !window.MediaRecorder) return "";
  if (type === "audio") {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
      "audio/aac",
      ""
    ];
    for (const candidate of candidates) {
      if (!candidate || MediaRecorder.isTypeSupported(candidate)) {
        return candidate;
      }
    }
  } else if (type === "video") {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4;codecs=avc1,mp4a.40.2",
      "video/mp4",
      ""
    ];
    for (const candidate of candidates) {
      if (!candidate || MediaRecorder.isTypeSupported(candidate)) {
        return candidate;
      }
    }
  }
  return "";
}

const isEnglishText = (text) => {
  if (!text) return false;
  const hasViAccents = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/i.test(text);
  if (hasViAccents) return false;
  return /[a-zA-Z]/i.test(text);
};

const segmentText = (text) => {
  if (!text) return [];

  // Split into sentences based on punctuation (keeping punctuation)
  const parts = text.split(/([.?!;\n:]+)/);
  const segments = [];
  
  let currentSentence = "";
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    
    // If it's punctuation, append to current sentence
    if (/^[.?!;\n:]+$/.test(part)) {
      currentSentence += part;
      if (currentSentence.trim()) {
        const lang = isEnglishText(currentSentence) ? "en-US" : "vi-VN";
        segments.push({ text: currentSentence.trim(), lang });
      }
      currentSentence = "";
    } else {
      if (currentSentence.trim()) {
        const lang = isEnglishText(currentSentence) ? "en-US" : "vi-VN";
        segments.push({ text: currentSentence.trim(), lang });
      }
      currentSentence = part;
    }
  }
  
  if (currentSentence.trim()) {
    const lang = isEnglishText(currentSentence) ? "en-US" : "vi-VN";
    segments.push({ text: currentSentence.trim(), lang });
  }

  return segments
    .map(s => ({ text: s.text.trim(), lang: s.lang }))
    .filter(s => s.text.length > 0);
};

export default function InterviewSessionRoomPage() {
  const { sessionId } = useParams();
  const query = useQuery();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState(0);
  const [isUploadingAnswer, setIsUploadingAnswer] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaMode, setMediaMode] = useState("audio+video");
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const isFinishingRef = useRef(false);

  const [isCameraMuted, setIsCameraMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [micActivityLevel, setMicActivityLevel] = useState(0);

  // Callback ref to bind user's camera feed to video element reliably
  const videoRefCallback = useCallback((el) => {
    if (el) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.play().catch((err) => console.warn("Video play failed:", err));
    }
  }, [stream]);

  // Audio Context analysis for visualizer
  useEffect(() => {
    if (!stream || isMicMuted) {
      setMicActivityLevel(0);
      return;
    }
    
    let audioCtx = null;
    let source = null;
    let analyser = null;
    let animationFrameId = null;

    try {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (audioCtx && audioCtx.state === "suspended") {
          audioCtx.resume().catch(() => null);
        }
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const level = Math.min(100, Math.round((average / 128) * 100));
        setMicActivityLevel(level);

        animationFrameId = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (e) {
      console.warn("Failed to initialize audio analyser:", e);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (source) source.disconnect();
      if (audioCtx && audioCtx.state !== "closed") audioCtx.close();
    };
  }, [stream, isMicMuted]);

  useEffect(() => {
    const handleUnload = () => {
      if (session?.session_type === "practice" && session?.id && !isFinishingRef.current) {
        deleteInterviewSession({ sessionId: session.id }).catch(() => null);
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      if (session?.session_type === "practice" && session?.id && !isFinishingRef.current) {
        deleteInterviewSession({ sessionId: session.id }).catch(() => null);
      }
    };
  }, [session?.id, session?.session_type]);

  // Custom loading screen states
  const [loadingProgress, setLoadingProgress] = useState(10);
  const [step1Status, setStep1Status] = useState("active");
  const [step1Subtitle, setStep1Subtitle] = useState("Đang tải dữ liệu phòng...");
  const [step2Status, setStep2Status] = useState("pending");
  const [step2Subtitle, setStep2Subtitle] = useState("Đang chờ...");
  const [step3Status, setStep3Status] = useState("pending");
  const [step3Subtitle, setStep3Subtitle] = useState("Đang chờ...");
  const [showEnterButton, setShowEnterButton] = useState(false);
  const [realtimeText, setRealtimeText] = useState("");
  const [localTranscripts, setLocalTranscripts] = useState({});
  const recognitionRef = useRef(null);
  const accumulatedTranscriptRef = useRef("");
  const currentSessionFinalRef = useRef("");
  const isRecordingRef = useRef(false);
  const messagesEndRef = useRef(null);
  const [lastSpokenIndex, setLastSpokenIndex] = useState(-1);
  const [pendingAnswerTransition, setPendingAnswerTransition] = useState(null);
  const [mediaError, setMediaError] = useState("");
  const [sttStatus, setSttStatus] = useState("");
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  const [selectedVoice, setSelectedVoice] = useState("mc_nu");
  const enVoiceRef = useRef(null);
  const viVoiceRef = useRef(null);
  const serverAudioRef = useRef(null);
  const ttsQueueRef = useRef([]);
  const currentTtsIndexRef = useRef(0);
  const keyboardAudioContextRef = useRef(null);

  const prepareKeyboardSound = useCallback(() => {
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    let audioContext = keyboardAudioContextRef.current;
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new AudioContextClass();
      keyboardAudioContextRef.current = audioContext;
    }
    audioContext.resume?.().catch(() => null);
    return audioContext;
  }, []);

  const playKeyboardSound = useCallback(() => {
    const audioContext = prepareKeyboardSound();
    if (!audioContext) return;

    // A short series of low-volume clicks provides typing feedback without an audio asset.
    for (let index = 0; index < 8; index += 1) {
      const startAt = audioContext.currentTime + index * 0.075;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(index % 4 === 3 ? 1250 : 1650, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.018, startAt + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.028);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.03);
    }
  }, [prepareKeyboardSound]);

  const getVoices = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return [];
    return window.speechSynthesis.getVoices();
  }, []);

  const selectVoices = useCallback(() => {
    const voicesList = getVoices();
    if (!voicesList.length) return;

    // Pick English Voice
    if (!enVoiceRef.current) {
      let enVoice = voicesList.find(v => v.lang === "en-US" && v.name.includes("Google"));
      if (!enVoice) {
        enVoice = voicesList.find(v => v.lang === "en-US" && v.name.includes("Natural"));
      }
      if (!enVoice) {
        enVoice = voicesList.find(v => v.lang.includes("en-US"));
      }
      if (!enVoice) {
        enVoice = voicesList.find(v => v.lang.startsWith("en"));
      }
      enVoiceRef.current = enVoice;
    }

    // Pick Vietnamese Voice
    if (!viVoiceRef.current) {
      let viVoice = voicesList.find(v => v.lang === "vi-VN" && v.name.includes("Google"));
      if (!viVoice) {
        viVoice = voicesList.find(v => v.lang === "vi-VN" && v.name.includes("Natural"));
      }
      if (!viVoice) {
        viVoice = voicesList.find(v => v.lang.includes("vi-VN"));
      }
      if (!viVoice) {
        viVoice = voicesList.find(v => v.lang.startsWith("vi"));
      }
      viVoiceRef.current = viVoice;
    }
  }, [getVoices]);

  // Load voices on startup and when voices change
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    selectVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = selectVoices;
    }
  }, [selectVoices]);

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (serverAudioRef.current) {
      try {
        serverAudioRef.current.pause();
      } catch (e) {}
      serverAudioRef.current = null;
    }
    ttsQueueRef.current = [];
    currentTtsIndexRef.current = 0;
    setIsAiSpeaking(false);
  };

  const speakNextChunk = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const index = currentTtsIndexRef.current;
    const queue = ttsQueueRef.current;

    if (index >= queue.length) {
      setIsAiSpeaking(false);
      return;
    }

    const chunk = queue[index];
    const utterance = new SpeechSynthesisUtterance(chunk.text);
    utterance.lang = chunk.lang;

    const voicesList = window.speechSynthesis.getVoices();
    if (!enVoiceRef.current || !viVoiceRef.current) {
      selectVoices();
    }

    let voice = chunk.lang === "en-US" ? enVoiceRef.current : viVoiceRef.current;

    if (voice && !voicesList.some(v => v.name === voice.name)) {
      voice = voicesList.find(v => v.lang.includes(chunk.lang === "en-US" ? "en" : "vi"));
    }

    if (voice) {
      utterance.voice = voice;
    }
    utterance.pitch = 1.0;
    if (chunk.lang === "en-US") {
      utterance.rate = 0.98;
    } else {
      utterance.rate = 0.92;
    }

    utterance.onstart = () => {
      setIsAiSpeaking(true);
    };

    utterance.onend = () => {
      currentTtsIndexRef.current += 1;
      speakNextChunk();
    };

    utterance.onerror = (event) => {
      console.error("SpeechSynthesis error:", event);
      currentTtsIndexRef.current += 1;
      speakNextChunk();
    };

    window.speechSynthesis.speak(utterance);
  };

  const speakText = (text) => {
    if (!text) return;
    stopSpeaking();

    if (selectedVoice === "default") {
      const segments = segmentText(text);
      if (segments.length === 0) return;

      ttsQueueRef.current = segments;
      currentTtsIndexRef.current = 0;
      speakNextChunk();
    } else {
      setIsAiSpeaking(true);
      const host = window.location.hostname || "localhost";
      const url = `http://${host}:8001/api/v1/tts/synthesize?text=${encodeURIComponent(text)}&voice=${selectedVoice}`;
      const audio = new Audio(url);
      serverAudioRef.current = audio;
      
      audio.onended = () => {
        setIsAiSpeaking(false);
        serverAudioRef.current = null;
      };
      audio.onerror = (err) => {
        console.error("Server TTS audio play error:", err);
        setIsAiSpeaking(false);
        serverAudioRef.current = null;
      };
      audio.play().catch(err => {
        console.warn("Audio play blocked by browser:", err);
        setIsAiSpeaking(false);
        serverAudioRef.current = null;
        setSttStatus("Trình duyệt chặn tự động phát. Hãy bấm nút hình Loa bên cạnh câu hỏi để nghe.");
      });
    }
  };

  const questions = session?.questions || [];
  const currentQuestion = questions[currentIndex] || null;
  const answeredQuestionIds = new Set((session?.answers || []).map((item) => item.question_id));
  const isFinished = ["evaluating", "completed", "failed"].includes(session?.status);

  // Keep the answer on screen long enough to be perceived before advancing or speaking again.
  useEffect(() => {
    if (!pendingAnswerTransition) return undefined;

    const savedAnswer = (session?.answers || []).find(
      (answer) => answer.question_id === pendingAnswerTransition.questionId,
    );
    if (!savedAnswer) return undefined;

    const displayedTranscript = savedAnswer.transcript || localTranscripts[pendingAnswerTransition.questionId];
    if (!displayedTranscript && !["failed", "skipped"].includes(savedAnswer.transcription_status)) {
      const pollTimer = window.setTimeout(async () => {
        try {
          setSession(await fetchInterviewReport({ sessionId: session.id }));
        } catch (pollError) {
          console.warn("Unable to refresh the answer transcript:", pollError);
        }
      }, 1000);
      return () => window.clearTimeout(pollTimer);
    }

    playKeyboardSound();
    const transitionTimer = window.setTimeout(() => {
      if (pendingAnswerTransition.nextIndex !== null) {
        setCurrentIndex(pendingAnswerTransition.nextIndex);
      }
      setPendingAnswerTransition(null);
    }, 750);

    return () => window.clearTimeout(transitionTimer);
  }, [pendingAnswerTransition, playKeyboardSound, session?.answers, session?.id, localTranscripts]);

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (keyboardAudioContextRef.current?.state !== "closed") {
        keyboardAudioContextRef.current.close().catch(() => null);
      }
    };
  }, []);

  // Automatic Text-to-Speech logic
  useEffect(() => {
    if (status !== "ready" || !questions.length || isFinished || pendingAnswerTransition) return;

    const hasAnswerForPrev = currentIndex > 0 && (session?.answers || []).some(a => a.question_id === questions[currentIndex - 1].id);
    const hasAnswerForCurrent = (session?.answers || []).some(a => a.question_id === questions[currentIndex].id);
    const allAnswered = (session?.answers || []).length === questions.length;

    if (allAnswered && hasAnswerForCurrent) {
      if (lastSpokenIndex !== 9999) {
        const lastQ = questions[questions.length - 1];
        const isLastQEng = lastQ && isEnglishText(lastQ.question_text);
        const completionText = isLastQEng
          ? "Thank you for your answer. You have completed all the questions. Please click Finish Interview to complete."
          : "Cảm ơn câu trả lời của bạn. Bạn đã trả lời xong tất cả các câu hỏi. Vui lòng bấm Kết thúc phỏng vấn để hoàn tất.";
        speakText(completionText);
        setLastSpokenIndex(9999);
      }
      return;
    }

    if (lastSpokenIndex !== currentIndex) {
      const qText = questions[currentIndex].question_text;
      const isQEng = isEnglishText(qText);

      if (currentIndex === 0) {
        speakText(qText);
      } else if (hasAnswerForPrev) {
        const intro = isQEng
          ? "Thank you for your answer. Here is the next question: "
          : "Cảm ơn câu trả lời của bạn. Sau đây là câu hỏi tiếp theo: ";
        speakText(intro + qText);
      } else {
        const intro = isQEng
          ? `Question number ${currentIndex + 1}: `
          : `Câu hỏi số ${currentIndex + 1}: `;
        speakText(intro + qText);
      }
      setLastSpokenIndex(currentIndex);
    }
  }, [currentIndex, status, questions, session?.answers, isFinished, lastSpokenIndex, pendingAnswerTransition]);

  useEffect(() => {
    let cancelled = false;
    let progressTimer = null;
    
    async function boot() {
      const jobPostingId = query.get("jobPostingId");
      const cvDocumentId = query.get("cvDocumentId");
      if (!sessionId && (!jobPostingId || !cvDocumentId)) {
        setStatus("error");
        setError("Thiếu thông tin phiên phỏng vấn.");
        return;
      }
      
      setLoadingProgress(15);
      setStep1Status("active");
      setStep1Subtitle("Đang tải dữ liệu phòng...");
      
      try {
        const created = sessionId
          ? await fetchInterviewSession({ sessionId })
          : await createInterviewSession({ jobPostingId, cvDocumentId });
          
        if (!sessionId && created?.id) {
          navigate(`/phong-van/${created.id}/phong`, { replace: true });
        }
        
        if (cancelled) return;
        
        setStep1Status("done");
        setStep1Subtitle("Phòng đã sẵn sàng");
        setStep2Status("active");
        setStep2Subtitle("Đang sinh kịch bản câu hỏi...");
        setLoadingProgress(45);

        let currentProg = 45;
        progressTimer = setInterval(() => {
          currentProg = Math.min(currentProg + Math.floor(Math.random() * 3) + 1, 80);
          setLoadingProgress(currentProg);
        }, 400);

        const withQuestions = created?.questions?.length
          ? created
          : await generateInterviewQuestions({ sessionId: created.id });

        if (progressTimer) clearInterval(progressTimer);
        
        if (cancelled) return;
        
        setStep2Status("done");
        setStep2Subtitle("Kịch bản đã sẵn sàng");
        setStep3Status("active");
        setStep3Subtitle("Đang kết nối camera & micro...");
        setLoadingProgress(85);

        try {
          const nextStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          setStream(nextStream);
          setMediaMode("audio+video");
          setMediaError("");
        } catch (e) {
          try {
            const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setStream(audioOnly);
            setMediaMode("audio-only");
            setMediaError("");
          } catch (errMedia) {
            console.warn("Could not get media stream:", errMedia);
            setMediaError("Không thể truy cập camera hoặc micro. Vui lòng cấp quyền thiết bị hoặc kiểm tra kết nối HTTPS.");
          }
        }
        
        setStep3Status("done");
        setStep3Subtitle("Thiết bị đã kết nối");
        setLoadingProgress(100);
        
        if (!cancelled) {
          setSession(withQuestions);
          setShowEnterButton(true);
        }
      } catch (err) {
        if (progressTimer) clearInterval(progressTimer);
        if (!cancelled) {
          setStatus("error");
          setError(err?.message || "Không thể mở phòng phỏng vấn.");
        }
      }
    }
    boot();
    return () => {
      cancelled = true;
      if (progressTimer) clearInterval(progressTimer);
    };
  }, [sessionId, query, navigate]);



  useEffect(
    () => () => {
      stream?.getTracks?.().forEach((track) => track.stop());
    },
    [stream],
  );

  useEffect(() => {
    return () => {
      stopSpeechRecognition();
    };
  }, []);

  const ensureMedia = async () => {
    if (stream) return stream;
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setStream(nextStream);
      setMediaMode("audio+video");
      setMediaError("");
      return nextStream;
    } catch {
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setStream(audioOnly);
        setMediaMode("audio-only");
        setMediaError("");
        return audioOnly;
      } catch (e) {
        setMediaError("Không thể truy cập camera hoặc micro. Vui lòng cấp quyền thiết bị hoặc kiểm tra kết nối HTTPS.");
        throw e;
      }
    }
  };

  const startRecording = async () => {
    try {
      stopSpeaking();
      const activeStream = await ensureMedia();
      // Apply current mute states on the fresh active stream tracks
      activeStream.getAudioTracks().forEach(track => {
        track.enabled = !isMicMuted;
      });
      activeStream.getVideoTracks().forEach(track => {
        track.enabled = !isCameraMuted;
      });
      recordedChunksRef.current = [];

      const hasVideo = activeStream.getVideoTracks().length > 0;
      const mimeType = getSupportedMimeType(hasVideo ? "video" : "audio");
      const options = mimeType ? { mimeType } : undefined;

      console.log(`Starting single MediaRecorder. Has video: ${hasVideo}. MIME type: ${mimeType}`);
      const recorder = new MediaRecorder(activeStream, options);
      recorder.ondataavailable = (event) => {
        if (event.data?.size) recordedChunksRef.current.push(event.data);
      };
      
      recorderRef.current = recorder;
      recorder.start();

      setRecordingStartedAt(Date.now());
      setIsRecording(true);

      // Initialize Web Speech API for real-time transcription feedback
      isRecordingRef.current = true;
      accumulatedTranscriptRef.current = "";
      currentSessionFinalRef.current = "";
      setRealtimeText("");

      if (typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
        setSttStatus("Đang khởi động...");
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!recognitionRef.current) {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;

          rec.onstart = () => {
            console.log("[STT] SpeechRecognition active. Listening for voice input...");
            setSttStatus("Đang lắng nghe...");
          };

          rec.onresult = (event) => {
            setSttStatus("Đang nhận diện...");
            let sessionFinal = "";
            let sessionInterim = "";
            for (let i = 0; i < event.results.length; ++i) {
              const result = event.results[i];
              if (result.isFinal) {
                sessionFinal += result[0].transcript;
              } else {
                sessionInterim += result[0].transcript;
              }
            }
            currentSessionFinalRef.current = sessionFinal;
            setRealtimeText(accumulatedTranscriptRef.current + (accumulatedTranscriptRef.current && (sessionFinal || sessionInterim) ? " " : "") + sessionFinal + sessionInterim);
          };

          rec.onerror = (err) => {
            console.warn("[STT] SpeechRecognition error:", err);
            if (err.error === "no-speech") {
              console.log("[STT] Silence timeout (no-speech). Restarting engine...");
              return;
            }
            let errMsg = err.error || "Không rõ";
            if (err.error === "not-allowed") {
              errMsg = "not-allowed (Chưa cho phép Mic hoặc website không chạy trên localhost/HTTPS)";
            } else if (err.error === "network") {
              errMsg = "network (Lỗi kết nối tới cloud speech của Google)";
            }
            setSttStatus("Lỗi: " + errMsg);
          };

          rec.onend = () => {
            console.log("[STT] SpeechRecognition session ended.");
            if (currentSessionFinalRef.current) {
              accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? " " : "") + currentSessionFinalRef.current;
            }
            currentSessionFinalRef.current = "";

            if (isRecordingRef.current) {
              setSttStatus("Đang khởi động lại...");
              setTimeout(() => {
                if (isRecordingRef.current) {
                  try {
                    recognitionRef.current.start();
                  } catch (e) {
                    console.warn("[STT] Failed to restart SpeechRecognition:", e);
                  }
                }
              }, 300);
            } else {
              setSttStatus("Đã dừng.");
            }
          };

          recognitionRef.current = rec;
        }

        // Apply dynamic language setting before starting
        const isEng = isEnglishText(currentQuestion?.question_text);
        recognitionRef.current.lang = isEng ? "en-US" : "vi-VN";
        console.log(`[STT] SpeechRecognition starting. Language: ${recognitionRef.current.lang} | Question: "${currentQuestion?.question_text || ""}"`);

        const tryStart = (retries = 3) => {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.warn(`[STT] Failed to start SpeechRecognition (retries left: ${retries}):`, e);
            if (retries > 0) {
              try {
                recognitionRef.current.abort();
              } catch (abortErr) {}
              
              setTimeout(() => {
                if (isRecordingRef.current) {
                  tryStart(retries - 1);
                }
              }, 200);
            } else {
              setSttStatus("Lỗi khởi chạy: " + e.message);
            }
          }
        };
        tryStart();
      } else {
        setSttStatus("Trình duyệt không hỗ trợ Web Speech API. Vui lòng dùng Chrome/Edge.");
      }
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError(`Không thể bắt đầu ghi âm/ghi hình: ${err.message || err}`);
      setIsRecording(false);
    }
  };

  const stopRecorder = (recorder) =>
    new Promise((resolve) => {
      if (!recorder || recorder.state === "inactive") {
        resolve();
        return;
      }
      recorder.onstop = () => resolve();
      recorder.stop();
    });

  const stopSpeechRecognition = () => {
    isRecordingRef.current = false;
    setSttStatus("Đã dừng.");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
  };

  const stopAndUpload = async () => {
    if (!currentQuestion) return;
    // Create/resume the audio context while this click still has browser user activation.
    prepareKeyboardSound();
    setIsUploadingAnswer(true);
    setUploadProgress(0);
    
    // Preserve browser speech-recognition text so it appears immediately while server STT finishes.
    const recognizedText = realtimeText.trim() || [
      accumulatedTranscriptRef.current,
      currentSessionFinalRef.current,
    ].filter(Boolean).join(" ").trim();
    if (recognizedText) {
      setLocalTranscripts(prev => ({
        ...prev,
        [currentQuestion.id]: recognizedText
      }));
    }
    
    stopSpeechRecognition();
    try {
      await stopRecorder(recorderRef.current);
      setIsRecording(false);

      const hasVideo = stream?.getVideoTracks().length > 0;
      const fallbackMime = hasVideo ? "video/webm" : "audio/webm";
      const recordedBlob = buildBlob(recordedChunksRef.current, fallbackMime);
      const durationSeconds = recordingStartedAt ? (Date.now() - recordingStartedAt) / 1000 : null;

      await uploadInterviewAnswer({
        sessionId: session.id,
        questionId: currentQuestion.id,
        audioBlob: recordedBlob,
        videoBlob: hasVideo ? recordedBlob : null,
        durationSeconds,
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
      });
      const refreshed = await fetchInterviewReport({ sessionId: session.id });
      setSession(refreshed);
      setRealtimeText("");
      setPendingAnswerTransition({
        questionId: currentQuestion.id,
        nextIndex: currentIndex < questions.length - 1 ? currentIndex + 1 : null,
      });
    } catch (err) {
      console.error("Upload error:", err);
      setError(err?.message || "Không thể tải câu trả lời lên hệ thống.");
    } finally {
      setIsUploadingAnswer(false);
    }
  };

  const finish = async () => {
    setStatus("finishing");
    isFinishingRef.current = true;
    try {
      await finishInterviewSession({ sessionId: session.id });
      navigate(resultPath(session), { replace: true });
    } catch (err) {
      isFinishingRef.current = false;
      setStatus("ready");
      setError(err?.message || "Không thể kết thúc phỏng vấn.");
    }
  };

  const chatMessages = useMemo(() => {
    const msgs = [];
    questions.forEach((q, index) => {
      if (index <= currentIndex) {
        msgs.push({
          id: `q-${q.id}`,
          sender: "agent",
          text: q.question_text,
          category: q.category,
        });

        const ans = (session?.answers || []).find((a) => a.question_id === q.id);
        if (ans) {
          const localTxt = localTranscripts[q.id] || "";
          let displayText = ans.transcript || localTxt;
          if (!displayText) {
            if (ans.transcription_status === "processing") {
              displayText = "Đang chuyển âm thanh thành văn bản...";
            } else if (ans.transcription_status === "failed") {
              displayText = "Không thể chuyển đổi âm thanh.";
            } else {
              displayText = "Đang xử lý...";
            }
          }
          const isTranscribing = !ans.transcript && !localTxt && ans.transcription_status !== "failed";
          if (isTranscribing) displayText = "Đang chuyển giọng nói sang văn bản";
          msgs.push({
            id: `a-${ans.id}`,
            sender: "candidate",
            text: displayText,
            isTranscribing,
          });
        } else if (index === currentIndex && (isRecording || isUploadingAnswer)) {
          msgs.push({
            id: isRecording ? "current-recording" : "answer-transcribing",
            sender: "candidate",
            text: isRecording
              ? realtimeText
                ? realtimeText
                : sttStatus
                ? `(${sttStatus})`
                : "(Đang ghi nhận giọng nói của bạn...)"
              : "Đang chuyển giọng nói sang văn bản",
            isLive: isRecording,
            isTranscribing: isUploadingAnswer,
          });
        }
      }
    });
    return msgs;
  }, [questions, currentIndex, session?.answers, isRecording, isUploadingAnswer, realtimeText, sttStatus, localTranscripts]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (status === "loading") {
    const steps = [
      { title: "Chuẩn bị phòng phỏng vấn", subtitle: step1Subtitle, status: step1Status },
      { title: "Chuẩn bị kịch bản phòng phỏng vấn", subtitle: step2Subtitle, status: step2Status },
      { title: "Agent tham gia phỏng vấn", subtitle: step3Subtitle, status: step3Status },
    ];

    const handleEnterRoom = () => {
      setStatus("ready");
    };

    const handleBack = () => {
      const isPractice = session?.session_type === "practice" || window.location.pathname.includes("/luyen-tap/");
      const targetId = session?.id || sessionId;
      if (isPractice && targetId) {
        deleteInterviewSession({ sessionId: targetId }).catch(() => null);
      }
      navigate(isPractice ? "/luyen-tap/tao-moi" : "/viec-lam");
    };

    return (
      <main className="interview-legacy min-h-screen bg-[var(--color-bg)]">
        <section className="waiting-shell">
          <div className="waiting-overlay" />
          <article className="waiting-card">
            <header className="waiting-card-head">
              <span className="waiting-head-icon">
                <BriefcaseBusiness className="h-7 w-7" />
              </span>
              <h2>Đang chuẩn bị phòng phỏng vấn</h2>
              <p>Vui lòng chờ trong giây lát...</p>
            </header>

            <div className="waiting-card-body">
              <div className="waiting-step-list">
                {steps.map((item) => (
                  <div key={item.title} className={`waiting-step ${item.status}`}>
                    <div className="waiting-step-icon">
                      {item.status === "done" ? <CheckCircle2 className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                    </div>
                    <div className="waiting-step-text">
                      <strong>{item.title}</strong>
                      <span>{item.subtitle}</span>
                    </div>
                    <span className="waiting-step-dot" />
                  </div>
                ))}
              </div>

              <div className="waiting-progress-head">
                <span>{loadingProgress < 100 ? "Đang chuẩn bị kịch bản..." : "Phòng phỏng vấn đã sẵn sàng!"}</span>
                <strong>{loadingProgress}%</strong>
              </div>
              <div className="waiting-progress-track">
                <span style={{ width: `${loadingProgress}%` }} />
              </div>

              {/* Voice Selection Selector in waiting card */}
              {showEnterButton && (
                <div className="waiting-voice-selector" style={{
                  marginTop: "24px",
                  padding: "16px",
                  borderRadius: "16px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(135, 153, 255, 0.15)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  textAlign: "left"
                }}>
                  <label style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#95a2e7",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    <Volume2 size={16} /> Chọn giọng nói người dẫn AI:
                  </label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={selectedVoice}
                      onChange={(e) => {
                        setSelectedVoice(e.target.value);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: "rgba(19, 22, 43, 0.9)",
                        border: "1px solid rgba(135, 153, 255, 0.25)",
                        color: "#eef2ff",
                        fontSize: "13px",
                        fontWeight: "600",
                        appearance: "none",
                        outline: "none",
                        cursor: "pointer"
                      }}
                    >
                      <option value="default" style={{ backgroundColor: "#141229", color: "#eef2ff" }}>Mặc định (Giọng trình duyệt)</option>
                      <option value="mc_nam" style={{ backgroundColor: "#141229", color: "#eef2ff" }}>MC Nam (Chuyên nghiệp)</option>
                      <option value="mc_nu" style={{ backgroundColor: "#141229", color: "#eef2ff" }}>MC Nữ (Truyền cảm)</option>
                      <option value="do_mixi" style={{ backgroundColor: "#141229", color: "#eef2ff" }}>Độ Mixi (AI Voice)</option>
                    </select>
                    <div style={{
                      position: "absolute",
                      right: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                      color: "#95a2e7",
                      fontSize: "10px"
                    }}>
                      ▼
                    </div>
                  </div>
                </div>
              )}

              <footer className="waiting-card-actions">
                <button type="button" className="waiting-ghost-btn" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại
                </button>
                <button 
                  type="button" 
                  className="waiting-primary-btn" 
                  onClick={handleEnterRoom}
                  disabled={!showEnterButton}
                  style={{ opacity: showEnterButton ? 1 : 0.6, cursor: showEnterButton ? "pointer" : "not-allowed" }}
                >
                  Vào phòng phỏng vấn
                </button>
              </footer>
            </div>
          </article>
        </section>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="interview-legacy grid min-h-screen place-items-center bg-[var(--color-bg)] p-6">
        <EmptyState title="Không thể mở phòng phỏng vấn" description={error} />
      </main>
    );
  }

  return (
    <main className="interview-legacy interview-room-layout bg-[var(--color-bg)] p-3 md:p-4">
      <div className="mx-auto flex flex-col w-full max-w-7xl h-full gap-3 overflow-hidden">
        <header className="role-hero">
          <div className="role-hero-content">
            <div>
              <StatusBadge status={isFinished ? "active" : "reviewing"}>{displayStatus(session?.status)}</StatusBadge>
              <h2>{session?.job_posting?.title || session?.practice_config?.target_role || "Phỏng vấn luyện tập"}</h2>
              <p>{session?.job_posting?.company || session?.session_type || "interview"}</p>
            </div>
            <Button
              variant="ghost"
              onClick={async () => {
                const isPractice = session?.session_type === "practice" || window.location.pathname.includes("/luyen-tap/");
                const targetId = session?.id || sessionId;
                if (isPractice && targetId) {
                  deleteInterviewSession({ sessionId: targetId }).catch(() => null);
                }
                navigate(isPractice ? "/luyen-tap/tao-moi" : "/viec-lam");
              }}
            >
              <ArrowLeft size={16} /> Quay lại
            </Button>
          </div>
        </header>

        {error ? (
          <p className="rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        {typeof window !== "undefined" && !window.location.protocol.startsWith('https') && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
          <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 flex flex-col gap-1 mb-2">
            <span className="font-bold">⚠️ Cảnh báo: Kết nối không bảo mật (HTTP IP LAN)</span>
            <span>Trình duyệt Chrome/Edge sẽ chặn camera, microphone và nhận dạng giọng nói thời gian thực (SpeechRecognition) trên các địa chỉ IP không bảo mật. Vui lòng truy cập qua <strong>localhost</strong> hoặc cấu hình Chrome Flags (<code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>) để cấp quyền thiết bị.</span>
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-[1fr_420px] flex-1 min-h-0">
          <div className="flex flex-col gap-3 h-full min-h-0">
            <SectionCard
              title="Điều khiển phỏng vấn"
              subtitle={`Tiến độ: ${currentIndex + 1}/${questions.length}`}
              action={<StatusBadge status={mediaMode === "audio-only" ? "reviewing" : "active"}>{mediaMode}</StatusBadge>}
              className="flex-shrink-0"
            >
              <div className="flex flex-col gap-3">
                {/* Horizontal Question Stepper */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {questions.map((question, index) => {
                    const isCurrent = index === currentIndex;
                    const isAnswered = answeredQuestionIds.has(question.id);
                    return (
                      <button
                        key={question.id}
                        type="button"
                        className={`flex-1 min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center border ${
                          isCurrent
                            ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-sm scale-105"
                            : isAnswered
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400"
                            : "bg-[var(--color-surface-muted)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
                        }`}
                        onClick={() => setCurrentIndex(index)}
                        title={`Câu ${index + 1}: ${isAnswered ? "Đã gửi" : "Chưa trả lời"}`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>

                {isUploadingAnswer ? (
                  <div className="w-full bg-[var(--color-surface-muted)] rounded-[12px] border border-[var(--color-border)] p-3">
                    <div className="flex mb-1.5 items-center justify-between text-xs font-bold text-[var(--color-primary)]">
                      <span>Đang tải câu trả lời lên hệ thống...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : null}



                <div className="flex flex-wrap gap-2.5">
                  {!isRecording ? (
                    <Button variant="primary" onClick={startRecording} disabled={isFinished || !currentQuestion || isUploadingAnswer} className="shadow-md">
                      <Mic size={14} className="mr-1" /> Bắt đầu trả lời
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={stopAndUpload} isLoading={isUploadingAnswer} className="shadow-md">
                      <Square size={14} className="mr-1" /> Dừng và gửi câu trả lời
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={finish}
                    isLoading={status === "finishing"}
                    disabled={!session?.answers?.length || isRecording || isUploadingAnswer || session?.status === "completed"}
                  >
                    <CheckCircle2 size={14} className="mr-1" /> Kết thúc phỏng vấn
                  </Button>
                </div>
              </div>
            </SectionCard>

            {/* Video Call Layout: You & AI Interviewer */}
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* You: Camera Preview */}
              <SectionCard title="Xem trước camera" subtitle="Góc quay ứng viên (bạn)" className="interview-card-stretch h-full min-h-0">
                <div className="flex-1 min-h-0 flex items-center justify-center bg-slate-950 rounded-[14px] overflow-hidden border border-[var(--color-border)] relative">
                  {mediaError && (
                    <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center z-10">
                      <p className="text-rose-400 font-bold text-sm mb-2">⚠️ Thiết bị chưa kết nối</p>
                      <p className="text-white/80 text-xs max-w-xs">{mediaError}</p>
                    </div>
                  )}
                  <video
                    ref={videoRefCallback}
                    autoPlay
                    muted
                    playsInline
                    className={`h-full w-full object-cover ${(!stream || !stream.getVideoTracks().length || isCameraMuted) ? "hidden" : ""}`}
                  />
                  <AudioWaveform activityLevel={micActivityLevel} isRecording={isRecording} />
                  {(!stream || !stream.getVideoTracks().length || isCameraMuted) && (
                    <div className="grid h-full place-items-center text-sm font-bold text-white/70">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-20 w-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl font-black text-white shadow-inner">
                          {session?.candidate_user?.name ? session.candidate_user.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <span className="text-xs text-slate-400 font-semibold">Camera đang tắt</span>
                      </div>
                    </div>
                  )}

                  {/* Speaker indicator (Google Meet style) */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-900/70 backdrop-blur-sm border border-slate-800/50 px-3 py-1.5 rounded-lg z-20">
                    <div className="relative flex items-center justify-center h-6 w-6 rounded-full bg-slate-800 text-white">
                      {isMicMuted ? (
                        <MicOff size={12} className="text-rose-400" />
                      ) : (
                        <div className="relative flex items-center justify-center">
                          <Mic size={12} className="text-emerald-400 z-10" />
                          {!isMicMuted && micActivityLevel > 5 && (
                            <span 
                              className="absolute rounded-full bg-emerald-500/30 transition-all duration-75"
                              style={{
                                width: `${24 + (micActivityLevel / 100) * 16}px`,
                                height: `${24 + (micActivityLevel / 100) * 16}px`,
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-white max-w-[120px] truncate">
                      {session?.candidate_user?.name || "Bạn"}
                    </span>
                  </div>

                  {/* Google Meet style control overlay bar */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/80 backdrop-blur border border-slate-800 px-4 py-2 rounded-full shadow-lg z-20">
                    <button
                      type="button"
                      onClick={() => {
                        if (stream) {
                          stream.getAudioTracks().forEach(track => {
                            track.enabled = !track.enabled;
                          });
                          setIsMicMuted(prev => !prev);
                        }
                      }}
                      className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                        isMicMuted 
                          ? "bg-rose-600 text-white hover:bg-rose-700" 
                          : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                      }`}
                      title={isMicMuted ? "Bật Microphone" : "Tắt Microphone"}
                    >
                      {isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (stream) {
                          const nextMuted = !isCameraMuted;
                          setIsCameraMuted(nextMuted);
                          if (nextMuted) {
                            // Stop video tracks physically so the camera hardware/light turns off
                            stream.getVideoTracks().forEach(track => {
                              track.stop();
                            });
                            // Recreate stream with only audio tracks to notify components/browser that video is gone
                            const audioTracks = stream.getAudioTracks();
                            const newStream = new MediaStream(audioTracks);
                            setStream(newStream);
                          } else {
                            // Request new stream with video to turn camera hardware back on
                            try {
                              const newMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                              // Stop previous stream tracks
                              stream.getTracks().forEach(t => t.stop());
                              // Apply current microphone mute state to new audio tracks
                              newMediaStream.getAudioTracks().forEach(track => {
                                track.enabled = !isMicMuted;
                              });
                              setStream(newMediaStream);
                              setMediaError("");
                            } catch (err) {
                              console.error("Lỗi khi mở lại camera:", err);
                              setMediaError("Không thể bật lại camera. Vui lòng cấp quyền hoặc kiểm tra kết nối.");
                            }
                          }
                        }
                      }}
                      className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                        isCameraMuted 
                          ? "bg-rose-600 text-white hover:bg-rose-700" 
                          : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                      }`}
                      title={isCameraMuted ? "Bật Camera" : "Tắt Camera"}
                    >
                      {isCameraMuted ? <VideoOff size={18} /> : <Video size={18} />}
                    </button>
                  </div>
                </div>
              </SectionCard>

              {/* AI Interviewer: 2D Animated Avatar */}
              <SectionCard
                title="Người phỏng vấn AI"
                subtitle="Đang trực tiếp chấm điểm & dẫn dắt"
                className="interview-card-stretch h-full min-h-0"
                action={
                  isAiSpeaking ? (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] font-bold">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary-soft)] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-primary)]"></span>
                      </span>
                      Đang nói...
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] font-medium">
                      Đang nghe...
                    </div>
                  )
                }
              >
                <div className="flex-1 min-h-0 avatar-container relative flex items-center justify-center">
                  {/* Glowing State Halo Container */}
                  <div className={`relative flex items-center justify-center p-8 rounded-full border transition-all duration-500 ${
                    isAiSpeaking
                      ? "bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.25)]"
                      : isUploadingAnswer
                      ? "bg-indigo-500/5 border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.25)] animate-pulse"
                      : isRecording
                      ? "bg-amber-500/5 border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.2)]"
                      : "border-transparent bg-transparent"
                  }`}>
                    <HrAvatar2D isSpeaking={isAiSpeaking} />
                  </div>
                  {/* Waveform indicator overlay */}
                  {isAiSpeaking && (
                    <div className="absolute bottom-3 right-3 z-10 waveform-container">
                      <div className="waveform-bar talking-bar-1" />
                      <div className="waveform-bar talking-bar-2" />
                      <div className="waveform-bar talking-bar-3" />
                      <div className="waveform-bar talking-bar-4" />
                      <div className="waveform-bar talking-bar-5" />
                    </div>
                  )}

                  {/* AI Speaker indicator (Google Meet style) */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-900/70 backdrop-blur-sm border border-slate-800/50 px-3 py-1.5 rounded-lg z-20">
                    <div className="relative flex items-center justify-center h-6 w-6 rounded-full bg-slate-800 text-white">
                      <div className="relative flex items-center justify-center">
                        <Bot size={12} className="text-blue-400 z-10" />
                        {isAiSpeaking && (
                          <span className="absolute animate-ping h-8 w-8 rounded-full bg-blue-500/30" />
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-white">
                      Người phỏng vấn AI
                    </span>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>

          <div className="h-full min-h-0">
            <SectionCard 
              title="Hội thoại thời gian thực" 
              subtitle="Whisper & Speech Engine"
              action={
                isUploadingAnswer ? (
                  <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    Đang chuyển giọng nói sang văn bản...
                  </div>
                ) : isRecording ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Đang nghe...
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] font-medium">
                    Sẵn sàng
                  </div>
                )
              }
              className="interview-card-stretch"
            >
              <div className="flex flex-col gap-3 flex-1 min-h-0 bg-[var(--color-surface-muted)] rounded-[14px] border border-[var(--color-border)] p-4 overflow-y-auto">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <MessageSquare className="h-8 w-8 text-[var(--color-text-muted)] mb-2" />
                    <p className="text-sm font-medium text-[var(--color-text-muted)]">
                      Chưa bắt đầu hội thoại. Bấm "Bắt đầu trả lời" để trò chuyện.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[85%] ${
                        msg.sender === "agent" ? "self-start" : "self-end"
                      }`}
                    >
                      <div className={`flex items-center gap-1.5 mb-1 ${
                        msg.sender === "agent" ? "justify-start" : "justify-end"
                      }`}>
                        <span className="text-[10px] font-black uppercase text-[var(--color-text-muted)]">
                          {msg.sender === "agent" ? "Người phỏng vấn" : "Bạn"}
                        </span>
                        {msg.sender === "agent" && (
                          <button
                            type="button"
                            onClick={() => speakText(msg.text)}
                            className="inline-flex items-center justify-center rounded p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-border)]/20 transition-colors"
                            title="Nghe lại câu hỏi"
                            style={{ cursor: "pointer" }}
                          >
                            <Volume2 size={12} />
                          </button>
                        )}
                        {msg.isLive && (
                          <span className="flex h-1.5 w-1.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                        )}
                      </div>
                      <div
                        className={`rounded-[16px] px-3.5 py-2.5 text-sm font-medium leading-relaxed shadow-sm ${
                          msg.sender === "agent"
                            ? "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] rounded-tl-[4px]"
                            : msg.isLive
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 rounded-tr-[4px] italic"
                            : "bg-[var(--color-primary-soft)] border border-[var(--color-primary-soft)] text-[var(--color-text)] rounded-tr-[4px]"
                        }`}
                      >
                        {msg.isTranscribing ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span>{msg.text}</span>
                            <span className="inline-flex gap-0.5" aria-label="Đang xử lý">
                              {[0, 120, 240].map((delay) => (
                                <span
                                  key={delay}
                                  className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-bounce"
                                  style={{ animationDelay: `${delay}ms` }}
                                />
                              ))}
                            </span>
                          </span>
                        ) : msg.text}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </main>
  );
}

