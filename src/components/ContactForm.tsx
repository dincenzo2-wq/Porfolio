import React, { useState, useEffect } from "react";
import { Mail, Send, CheckCircle, Trash2, Calendar, User, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SavedMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  date: string;
}

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [savedMessages, setSavedMessages] = useState<SavedMessage[]>([]);

  // Load sent messages from localStorage to simulate real-world data persistence!
  useEffect(() => {
    try {
      const stored = localStorage.getItem("portfolio_messages");
      if (stored) {
        setSavedMessages(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Local storage access failed", e);
    }
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    setIsSending(true);

    // Simulate sending network lag
    setTimeout(() => {
      const newMessage: SavedMessage = {
        id: `msg-${Date.now()}`,
        name,
        email,
        subject: subject || "No Subject",
        message,
        date: new Date().toLocaleDateString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }),
      };

      const updated = [newMessage, ...savedMessages];
      setSavedMessages(updated);
      try {
        localStorage.setItem("portfolio_messages", JSON.stringify(updated));
      } catch (e) {
        console.error("Local storage save failed", e);
      }

      setIsSending(false);
      setSentSuccess(true);
      
      // Reset details
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");

      // Hide success notification after 5s
      setTimeout(() => setSentSuccess(false), 5000);
    }, 1200);
  };

  const deleteMessage = (id: string) => {
    const updated = savedMessages.filter((m) => m.id !== id);
    setSavedMessages(updated);
    try {
      localStorage.setItem("portfolio_messages", JSON.stringify(updated));
    } catch (e) {
      console.error("Local storage write failed", e);
    }
  };

  return (
    <section id="contact-section" className="py-24 border-t border-slate-200 px-4 bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-left mb-16 select-none max-w-xl">
          <p className="text-[13px] font-bold text-sky-650 font-mono uppercase tracking-[0.2em] mb-3">SECURE CONNECTION</p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold font-display tracking-[-0.05em] leading-none text-slate-900">
            Gửi thông điệp
          </h2>
          <p className="text-slate-600 text-[14px] mt-3 leading-relaxed">Kết nối trực tiếp ngay hôm nay. Trải nghiệm hệ thống hộp thư lưu động trực quan.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left panel: Form */}
          <div className="lg:col-span-7 rounded-[20px] border border-slate-200 bg-white p-6 md:p-8 flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="text-base font-bold font-display text-slate-800 mb-6 flex items-center gap-1.5 font-sans">
                <Send className="h-4 w-4 text-sky-600" /> Biểu mẫu liên lạc nhanh
              </h3>
              
              <form onSubmit={handleSend} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] text-slate-650 mb-1.5 uppercase font-mono tracking-wider">Họ tên của bạn *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 focus:outline-hidden transition-all duration-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-650 mb-1.5 uppercase font-mono tracking-wider">Địa chỉ Email *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="partner@com.vn"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 focus:outline-hidden transition-all duration-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] text-slate-650 mb-1.5 uppercase font-mono tracking-wider">Tiêu đề (Không bắt buộc)</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Hợp tác khảo sát dự án / Cơ cơ hội việc làm"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 focus:outline-hidden transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-[13px] text-slate-650 mb-1.5 uppercase font-mono tracking-wider">Nội dung thông điệp *</label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Xin chào! Tôi có cơ hội phát triển dự án này muốn cùng trao đổi..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 focus:outline-hidden transition-all duration-300"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSending}
                    className="w-full flex items-center justify-center gap-2 font-bold text-[13px] px-6 py-3 rounded-full bg-slate-900 hover:bg-slate-850 text-white shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                    {isSending ? "Cổng thông tin đang kết nối..." : "Bấm gửi thông tin liên hệ"}
                  </button>
                </div>
              </form>
            </div>

            {/* Success notification alert info */}
            <AnimatePresence>
              {sentSuccess && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="mt-4 flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-805"
                >
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <span className="text-[13px] font-semibold">Thông điệp của bạn đã gửi thành công và lưu tạm ở danh sách bên cạnh!</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right panel: Live local messages list */}
          <div className="lg:col-span-5 rounded-[20px] border border-slate-200 bg-white p-6 md:p-8 flex flex-col h-full max-h-[520px] shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5 select-none animate-fade-in">
              <h3 className="text-[13px] font-bold font-mono tracking-widest text-purple-600 uppercase flex items-center gap-1.5">
                📬 Hòm thư nhận (Giao diện ảo)
              </h3>
              <span className="text-[13px] bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full font-mono">
                {savedMessages.length} tin
              </span>
            </div>

            {/* Scrolling box layout */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {savedMessages.map((msg) => (
                <div key={msg.id} className="p-4 rounded-xl bg-slate-50 text-slate-800 border border-slate-200/80 relative group hover:bg-white hover:border-slate-300 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-sm hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Xóa tin nhắn"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[13px]">
                    <Calendar className="h-3 w-3 text-sky-600" />
                    <span>{msg.date}</span>
                  </div>

                  <h4 className="text-[14px] font-bold text-slate-900 mt-2 truncate max-w-[85%]">{msg.subject}</h4>
                  <p className="text-[13px] text-slate-600 leading-normal mt-1 whitespace-pre-line">{msg.message}</p>
                  
                  <div className="flex items-center gap-1 mt-3 border-t border-slate-200/85 pt-2.5 font-mono text-[13px] text-slate-500">
                    <User className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-800">{msg.name}</span> • <span className="text-slate-600">{msg.email}</span>
                  </div>
                </div>
              ))}

              {savedMessages.length === 0 && (
                <div className="text-center py-16 flex flex-col items-center justify-center gap-3 select-none">
                  <MessageSquare className="h-8 w-8 text-slate-300" />
                  <p className="text-[13px] text-slate-500">Tin nhắn gửi đi mô phỏng tại website này sẽ hiện diện chân thực ở đây.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
