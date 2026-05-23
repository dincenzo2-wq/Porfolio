import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, Sparkles, User, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface InteractiveChatbotProps {
  profile: UserProfile;
}

export default function InteractiveChatbot({ profile }: InteractiveChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Xin chào! Tôi là **Trợ lý ảo thông minh** đại diện cho **${profile.name}**. Hãy đặt bất kỳ câu hỏi nào về kinh nghiệm, kỹ năng hậu kỳ/quay dựng hay các dự án của ${profile.name}, tôi sẽ trả lời bạn ngay lập tức!`,
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initialPrompts = [
    { text: "Kỹ năng mạnh nhất là gì?", prompt: "Kỹ năng mạnh nhất và chuyên sâu nhất của bạn là gì?" },
    { text: "Tóm tắt kinh nghiệm làm việc?", prompt: "Hãy tóm tắt quá trình kinh nghiệm và lịch sử làm việc của bạn." },
    { text: "Xem dự án tiêu biểu nhất?", prompt: "Kể tên và mô tả dự án tiêu biểu nhất mà bạn từng làm." },
  ];

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim()) return;

    if (!customText) {
      setInputMessage("");
    }

    const newMessages = [...messages, { role: "user" as const, content: textToSend }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages,
          profile: profile, // Pass current frontend profile representation
        }),
      });

      if (!response.ok) {
        throw new Error("Không thể kết nối với cổng Gemini API trên Server.");
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant" as const, content: data.text }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ **Lỗi kết nối**: Trình duyệt không thể kích hoạt API Trợ lý AI trên máy chủ. Hãy đảm bảo bạn đã điền chính xác `GEMINI_API_KEY` trong mục **Settings > Secrets** của Google AI Studio.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: `Tôi đã được đặt lại thông tin phiên chat. Bạn muốn hỏi tôi điều gì khác về **${profile.name}** không?`,
      },
    ]);
  };

  return (
    <>
      {/* Dynamic Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40 select-none">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          id="btn-chatbot-toggle"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xl hover:bg-slate-800 focus:outline-hidden border border-slate-200 cursor-pointer"
        >
          {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
        </motion.button>
      </div>

      {/* Main Chatbot Window Pop-up */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            id="chatbot-window"
            className="fixed bottom-24 right-6 z-40 flex h-[550px] w-[380px] flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_15px_40px_rgba(15,23,42,0.08)] xs:w-[90vw] max-w-[420px]"
          >
            {/* Window Header */}
            <div className="flex items-center justify-between border-b border-slate-150 bg-slate-50/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 border border-sky-205 text-sky-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-1.5 leading-none">
                    AI Representative
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  </h3>
                  <p className="text-[13px] text-slate-500 mt-1">Trợ lý ảo của {profile.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearChat}
                  title="Xóa cuộc trò chuyện"
                  className="rounded-lg p-1.5 text-slate-550 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-slate-550 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Message Body Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold ${
                      msg.role === "user"
                        ? "bg-slate-150 text-slate-850 border border-slate-205"
                        : "bg-sky-50 border border-sky-200 text-sky-600"
                    }`}
                  >
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-slate-900 text-white font-medium"
                        : "bg-slate-50 border border-slate-150 text-slate-800"
                    }`}
                  >
                    {/* Render basic custom format or bolding parsed simply to HTML paragraphs */}
                    <div className="space-y-1.5 whitespace-pre-wrap">
                      {msg.content.split("\n").map((line, i) => {
                        // Very simple line formatting
                        let formattedLine = line;
                        // Bold marker **
                        const boldReg = /\*\*(.*?)\*\*/g;
                        const hasBold = boldReg.test(line);

                        if (hasBold) {
                          return (
                            <p
                              key={i}
                              dangerouslySetInnerHTML={{
                                __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                              }}
                            />
                          );
                        }
                        return <p key={i}>{formattedLine}</p>;
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 border border-sky-200 text-sky-600">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="max-w-[78%] rounded-2xl border border-slate-150 bg-slate-50 p-3 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-650/40 animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-650/70 animate-pulse [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-650 animate-pulse [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Prompts */}
            {messages.length === 1 && (
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-1.5">
                {initialPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(p.prompt)}
                    className="text-[13px] bg-white hover:bg-slate-100 border border-slate-200/80 px-3 py-1.5 rounded-full text-slate-750 hover:text-sky-600 hover:border-sky-305 transition-all text-left cursor-pointer font-medium"
                  >
                    {p.text}
                  </button>
                ))}
              </div>
            )}

            {/* Input Message Area */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  placeholder="Hỏi trợ lý về kinh nghiệm..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isLoading}
                  className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-4 pr-12 text-[13px] text-slate-805 placeholder-slate-400 focus:ring-1 focus:ring-sky-500/30 focus:outline-hidden transition-all disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="absolute right-1.5 rounded-full bg-slate-900 p-2 text-white hover:bg-slate-800 hover:scale-102 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
              <div className="text-[13px] text-center text-slate-450 mt-2 px-2 font-mono">
                Bảo mật thông tin • Dữ liệu thời gian thực • Gemini AI
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
