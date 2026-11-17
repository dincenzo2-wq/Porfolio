import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import type { InquiryFormErrors, InquiryFormInput } from '../types/portfolio';
import { validateInquiryForm } from '../utils/portfolioLogic';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_FORM: InquiryFormInput = {
  name: '',
  agencyOrBrand: '',
  email: '',
  projectType: 'TVC',
  timeline: 'Trong tuần này (24–48h)',
  brief: '',
};

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [form, setForm] = useState<InquiryFormInput>(INITIAL_FORM);
  const [errors, setErrors] = useState<InquiryFormErrors>({});
  const [submittedRecord, setSubmittedRecord] = useState<InquiryFormInput | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateInquiryForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      setSubmittedRecord({ ...form });
    }
  };

  const handleResetAndClose = () => {
    setSubmittedRecord(null);
    setForm(INITIAL_FORM);
    setErrors({});
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Gửi brief dự án cho Agency & Brand"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-xl rounded-2xl bg-white border border-black/10 p-6 sm:p-8 space-y-6 shadow-xl text-[#111111]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-black/8 pb-4">
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-black/55">
                  Hợp tác cùng Agency &amp; Brand
                </p>
                <h2 className="mt-1 font-bricolage text-xl sm:text-2xl text-[#111111] font-bold tracking-tight uppercase">
                  Gửi brief dự án mới
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng hộp thoại liên hệ"
                className="p-2 rounded-full border border-black/10 text-[#555555] hover:text-[#111111] hover:border-black/30 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submittedRecord ? (
              <div className="space-y-4 py-4" data-testid="inquiry-confirmation">
                <div className="inline-flex items-center gap-2 text-[#111111] font-semibold text-sm">
                  <Check className="w-4 h-4 text-[#111111]" />
                  <span>Đã ghi nhận brief dự án thành công!</span>
                </div>
                <h3 className="font-bricolage text-xl text-[#111111] font-bold tracking-tight uppercase">
                  Cảm ơn {submittedRecord.name}.
                </h3>
                <p className="text-sm text-[#555555] leading-relaxed">
                  Tôi đã nhận được yêu cầu cho dự án <strong className="text-[#111111]">{submittedRecord.projectType}</strong>. Tôi sẽ xem xét brief và phản hồi qua email{' '}
                  <span className="text-[#111111] font-semibold underline underline-offset-2">{submittedRecord.email}</span> trong vòng <strong className="text-[#111111]">2–4 giờ làm việc</strong>.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleResetAndClose}
                    className="px-6 py-2.5 rounded-full text-sm font-semibold bg-[#111111] hover:bg-black/85 text-white shadow-xs transition-all cursor-pointer"
                  >
                    Hoàn tất
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="contact-name" className="block font-medium text-[#333333]">
                      Tên của bạn *
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => {
                        setForm({ ...form, name: e.target.value });
                        if (errors.name) setErrors({ ...errors, name: undefined });
                      }}
                      placeholder="Nguyễn Minh Anh"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#F7F6F2] border border-black/10 text-sm text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-black/10 transition-colors"
                    />
                    {errors.name && (
                      <p className="text-xs text-[#DC2626]" role="alert">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="contact-agency" className="block font-medium text-[#333333]">
                      Agency / Thương hiệu
                    </label>
                    <input
                      id="contact-agency"
                      type="text"
                      value={form.agencyOrBrand}
                      onChange={(e) => setForm({ ...form, agencyOrBrand: e.target.value })}
                      placeholder="Dentsu / Ogilvy / Brand..."
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#F7F6F2] border border-black/10 text-sm text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-black/10 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="contact-email" className="block font-medium text-[#333333]">
                      Email liên hệ *
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => {
                        setForm({ ...form, email: e.target.value });
                        if (errors.email) setErrors({ ...errors, email: undefined });
                      }}
                      placeholder="producer@agency.vn"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#F7F6F2] border border-black/10 text-sm text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-black/10 transition-colors"
                    />
                    {errors.email && (
                      <p className="text-xs text-[#DC2626]" role="alert">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="contact-type" className="block font-medium text-[#333333]">
                      Định dạng dự án
                    </label>
                    <select
                      id="contact-type"
                      value={form.projectType}
                      onChange={(e) => setForm({ ...form, projectType: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#F7F6F2] border border-black/10 text-sm text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-black/10 transition-colors"
                    >
                      <option value="TVC">TVC &amp; Commercial 16:9</option>
                      <option value="Social 9:16">Social Video 9:16 (TikTok/Reels)</option>
                      <option value="Motion">Motion Graphics &amp; Typography động</option>
                      <option value="Event Recap">Event Recap &amp; Aftermovie 24h</option>
                      <option value="Chỉnh màu">Chỉnh màu (Color Grading)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="contact-brief" className="block font-medium text-[#333333]">
                    Mô tả brief dự án &amp; link tham khảo *
                  </label>
                  <textarea
                    id="contact-brief"
                    rows={4}
                    value={form.brief}
                    onChange={(e) => {
                      setForm({ ...form, brief: e.target.value });
                      if (errors.brief) setErrors({ ...errors, brief: undefined });
                    }}
                    placeholder="Mô tả ý tưởng, thời lượng dự kiến, link storyboard hoặc deadline bàn giao nháp..."
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#F7F6F2] border border-black/10 text-sm text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-black/10 transition-colors"
                  />
                  {errors.brief && (
                    <p className="text-xs text-[#DC2626]" role="alert">
                      {errors.brief}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-black/8">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-full text-xs font-medium text-[#666666] hover:text-[#111111] transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-[#111111] hover:bg-black/85 text-white shadow-xs transition-all cursor-pointer"
                  >
                    Gửi yêu cầu hợp tác
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
