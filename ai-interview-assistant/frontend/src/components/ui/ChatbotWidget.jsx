import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useUser } from "../../features/UserContext";
import { chatWithAssistant } from "../../api/assistant";
import { getAccessToken } from "../../utils/authSession";
import { 
  MessageCircle, 
  X, 
  Send, 
  RefreshCw, 
  Sparkles, 
  Bot, 
  ChevronDown 
} from "lucide-react";

// Regex-based lightweight markdown helper
function renderFormattedMessage(text) {
  if (!text) return "";
  
  const lines = text.split("\n");
  
  return lines.map((line, idx) => {
    // Bullet points
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const content = line.trim().replace(/^[-*]\s+/, "");
      return (
        <li key={idx} className="ml-4 list-disc text-xs sm:text-sm mb-1 leading-relaxed">
          {parseInlineMarkdown(content)}
        </li>
      );
    }
    
    // Numbered points
    if (/^\d+\.\s+/.test(line.trim())) {
      const content = line.trim().replace(/^\d+\.\s+/, "");
      const num = line.trim().match(/^(\d+)\.\s+/)[1];
      return (
        <li key={idx} className="ml-4 list-decimal text-xs sm:text-sm mb-1 leading-relaxed">
          {parseInlineMarkdown(content)}
        </li>
      );
    }
    
    // Empty line
    if (!line.trim()) {
      return <div key={idx} className="h-2" />;
    }
    
    // Paragraph
    return (
      <p key={idx} className="text-xs sm:text-sm mb-1.5 leading-relaxed">
        {parseInlineMarkdown(line)}
      </p>
    );
  });
}

function parseInlineMarkdown(text) {
  const parts = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const splitParts = text.split(regex);
  
  return splitParts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-bold text-[var(--color-text)]">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs font-mono text-indigo-600 dark:text-indigo-400">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export function ChatbotWidget() {
  const { user, isLoading } = useUser();
  const location = useLocation();
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const token = getAccessToken();
  const userName = user?.name || "bạn";

  // Visibility constraints (loading, interviews, login, onboarding, landing)
  const isInterviewRoom = location.pathname.includes("/phong");
  const isAuthPage = location.pathname === "/login" || location.pathname === "/google-callback";
  const isOnboarding = location.pathname === "/onboarding";
  const isRootLanding = location.pathname === "/";
  const shouldHide = !token || !user || isLoading || isInterviewRoom || isAuthPage || isOnboarding || isRootLanding;

  // Load message history from sessionStorage on mount
  useEffect(() => {
    if (shouldHide) return;
    
    const saved = sessionStorage.getItem("aiia_chatbot_messages");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading chat history", e);
      }
    } else {
      // Set initial greeting message
      const initialGreeting = {
        role: "assistant",
        content: `Xin chào ${userName}! Tôi là **AIIA Assistant**, trợ lý AI của hệ thống. Tôi có thể hỗ trợ giải đáp các thắc mắc về tính năng luyện tập phỏng vấn, so sánh CV/JD, phân tích lỗi, hoặc đưa ra các mẹo phỏng vấn tốt nhất. \n\nHôm nay tôi có thể giúp gì cho bạn?`
      };
      setMessages([initialGreeting]);
      sessionStorage.setItem("aiia_chatbot_messages", JSON.stringify([initialGreeting]));
    }
  }, [token, isInterviewRoom, userName]);

  // Save messages to sessionStorage when updated
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem("aiia_chatbot_messages", JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom when messages list updates or chat opens
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Handle focus on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (shouldHide) {
    return null;
  }

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputVal).trim();
    if (!text || loading) return;

    setInputVal("");
    const newMsg = { role: "user", content: text };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // We pass the conversation history, excluding the initial system message if any
      // Gemini expects: [{"role": "user"|"model", "content": "text"}]
      // Filter out any other custom fields
      const apiMessages = updatedMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await chatWithAssistant(apiMessages);
      const replyText = response?.reply || "Xin lỗi, tôi gặp sự cố kết nối. Hãy thử lại sau.";
      
      setMessages(prev => [...prev, { role: "assistant", content: replyText }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Có lỗi xảy ra khi xử lý tin nhắn. Vui lòng thử lại sau giây lát!" 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (window.confirm("Bạn có muốn xóa toàn bộ lịch sử trò chuyện này không?")) {
      const initialGreeting = {
        role: "assistant",
        content: `Xin chào ${userName}! Lịch sử trò chuyện đã được làm mới. Tôi có thể hỗ trợ gì cho bạn bây giờ?`
      };
      setMessages([initialGreeting]);
      sessionStorage.setItem("aiia_chatbot_messages", JSON.stringify([initialGreeting]));
    }
  };

  const handleQuickPrompt = (promptText) => {
    handleSend(promptText);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHasNewMessage(false);
    }
  };

  const quickPrompts = [
    "Làm thế nào để bắt đầu phỏng vấn thử?",
    "Cách phân tích CV khớp với JD?",
    "Mẹo trả lời câu hỏi phỏng vấn tự tin?",
    "Cấu hình tài khoản ở đâu?"
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Chat window panel */}
      {isOpen && (
        <div 
          className="absolute bottom-20 right-0 w-96 max-w-[calc(100vw-2rem)] h-[540px] flex flex-col rounded-2xl shadow-2xl transition-all duration-300 transform scale-100 origin-bottom-right"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
            boxShadow: "var(--shadow-md)"
          }}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between px-4 py-3.5 rounded-t-2xl border-b"
            style={{
              borderColor: "var(--color-border)",
              background: "linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(6, 182, 212, 0.05))"
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                  <Bot size={20} className="animate-pulse" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white dark:border-slate-900"></span>
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-wide flex items-center gap-1.5" style={{ fontFamily: "var(--font-display)" }}>
                  Trợ lý AI AIIA
                  <Sparkles size={13} className="text-yellow-500" />
                </h4>
                <p className="text-[10px] text-green-500 font-semibold uppercase tracking-wider">Online</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handleClear}
                title="Làm mới cuộc trò chuyện"
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-[var(--color-text-muted)] cursor-pointer"
              >
                <RefreshCw size={15} />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-[var(--color-text-muted)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages list */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{ background: "var(--color-bg)" }}
          >
            {messages.map((msg, index) => {
              const isUser = msg.role === "user";
              return (
                <div 
                  key={index} 
                  className={`flex ${isUser ? "justify-end" : "justify-start"} items-start gap-2.5`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-600 dark:text-slate-300">
                      <Bot size={15} />
                    </div>
                  )}
                  <div 
                    className={`rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                      isUser 
                        ? "bg-indigo-600 text-white rounded-tr-none max-w-[85%]" 
                        : "rounded-tl-none max-w-[85%]"
                    }`}
                    style={!isUser ? { 
                      background: "var(--color-surface)", 
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)" 
                    } : {}}
                  >
                    {isUser ? (
                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="space-y-1">
                        {renderFormattedMessage(msg.content)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Loading / Typing indicator */}
            {loading && (
              <div className="flex justify-start items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-600 dark:text-slate-300">
                  <Bot size={15} />
                </div>
                <div 
                  className="rounded-2xl rounded-tl-none px-4 py-3 shadow-xs flex items-center gap-1"
                  style={{ 
                    background: "var(--color-surface)", 
                    border: "1px solid var(--color-border)" 
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts (only show if history is short or empty of active queries) */}
          {messages.length <= 1 && !loading && (
            <div className="p-3 border-t overflow-x-auto whitespace-nowrap flex gap-2 hide-scrollbar" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="inline-block px-3 py-1.5 rounded-full border text-xs font-medium transition-all hover:border-indigo-500 hover:text-indigo-600 cursor-pointer"
                  style={{
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-muted)",
                    background: "var(--color-surface-muted)"
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Footer Input area */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t flex items-center gap-2 rounded-b-2xl"
            style={{ 
              borderColor: "var(--color-border)", 
              background: "var(--color-surface)" 
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Nhập tin nhắn..."
              disabled={loading}
              className="flex-1 min-w-0 bg-transparent py-1.5 text-sm focus:outline-hidden"
              style={{ color: "var(--color-text)" }}
            />
            <button
              type="submit"
              disabled={loading || !inputVal.trim()}
              className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                inputVal.trim() && !loading
                  ? "bg-indigo-600 text-white cursor-pointer hover:bg-indigo-700 shadow-xs"
                  : "text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-800"
              }`}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Floating bubble toggle button */}
      <button
        onClick={handleToggle}
        className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-transform duration-200 select-none cursor-pointer focus:outline-hidden relative hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #4f46e5, #0891b2)",
          boxShadow: "var(--shadow-ai)",
          zIndex: 50
        }}
      >
        {isOpen ? (
          <ChevronDown size={28} className="animate-spin-once" />
        ) : (
          <>
            <MessageCircle size={28} />
            {hasNewMessage && (
              <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white animate-ping"></span>
            )}
          </>
        )}
      </button>
    </div>
  );
}
