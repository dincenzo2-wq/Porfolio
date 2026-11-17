import { ArrowUpRight, Mail, Phone, Send } from 'lucide-react';
import { ARTIST_PROFILE } from '../data/portfolioData';
import type { SiteProfileData } from '../types/portfolio';

interface FooterProps {
  onOpenContact: () => void;
  profile?: SiteProfileData;
  onNavigateAdmin?: () => void;
}

export function Footer({ onOpenContact, profile }: FooterProps) {
  const currentProfile = profile || ARTIST_PROFILE;
  const footerTitle = profile?.footerTitle || 'Gửi brief dự án của bạn';
  const footerDescription =
    profile?.footerDescription ||
    'Báo giá rõ theo từng hạng mục trong 2 giờ. Hỗ trợ nhận file dựng từ xa (Remote) hoặc đi quay trực tiếp tại TP.HCM.';

  return (
    <footer className="w-full bg-[#0D0D0F] text-white border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-20 md:py-24 space-y-14">
        {/* Main CTA Section (Stable 100% Opacity) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 pb-12 border-b border-white/10">
          <div className="space-y-3 max-w-2xl lg:max-w-3xl">
            <h2 className="font-bricolage text-2xl sm:text-3xl md:text-4xl lg:text-[40px] text-white font-extrabold tracking-tight leading-[1.2] uppercase pt-1">
              {footerTitle === 'Gửi brief dự án của bạn' ? (
                <>
                  <span className="whitespace-nowrap">Gửi brief</span>{' '}
                  <span className="whitespace-nowrap">dự án của bạn</span>
                </>
              ) : (
                footerTitle
              )}
            </h2>
            <p className="text-sm md:text-base text-white/70 leading-relaxed max-w-2xl lg:max-w-3xl">
              {footerDescription.includes('từ xa (Remote)') ? (
                <>
                  Báo giá rõ theo từng hạng mục trong 2 giờ. Hỗ trợ nhận file dựng{' '}
                  <span className="whitespace-nowrap">từ xa (Remote)</span> hoặc đi quay trực tiếp tại TP.HCM.
                </>
              ) : (
                footerDescription
              )}
            </p>
          </div>

          <div className="flex items-center shrink-0 self-start md:self-center">
            <button
              type="button"
              onClick={onOpenContact}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-white text-[#0D0D0F] hover:bg-[#2563EB] hover:text-white text-sm sm:text-base font-bold shadow-md hover:shadow-xl transition-all cursor-pointer hover:scale-[1.02] active:scale-95 whitespace-nowrap"
            >
              <span>Gửi brief dự án ngay</span>
              <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Contact Grid & Direct Channels (Stable 100% Opacity) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          <div className="space-y-2">
            <span className="text-white/60 uppercase text-xs font-bold tracking-wider">Email công việc</span>
            <p className="font-medium text-sm md:text-base text-white">
              <a href={`mailto:${currentProfile.email}`} className="group hover:text-white text-white/90 transition-colors flex items-center gap-2">
                <Mail className="w-4 h-4 text-white/70 group-hover:text-[#3B82F6] transition-colors shrink-0" />
                <span className="truncate group-hover:underline underline-offset-4 decoration-[#3B82F6]/60">{currentProfile.email}</span>
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-white/60 uppercase text-xs font-bold tracking-wider">Hotline / Zalo</span>
            <p className="font-medium text-sm md:text-base text-white">
              <a href={`tel:${currentProfile.phone}`} className="group hover:text-white text-white/90 transition-colors flex items-center gap-2">
                <Phone className="w-4 h-4 text-white/70 group-hover:text-[#3B82F6] transition-colors shrink-0" />
                <span className="group-hover:underline underline-offset-4 decoration-[#3B82F6]/60">{currentProfile.phone}</span>
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-white/60 uppercase text-xs font-bold tracking-wider">Telegram</span>
            <p className="font-medium text-sm md:text-base text-white">
              <a href={`https://t.me/${currentProfile.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="group hover:text-white text-white/90 transition-colors flex items-center gap-2">
                <Send className="w-4 h-4 text-white/70 group-hover:text-[#3B82F6] transition-colors shrink-0" />
                <span className="group-hover:underline underline-offset-4 decoration-[#3B82F6]/60">{currentProfile.telegram}</span>
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-white/60 uppercase text-xs font-bold tracking-wider">Địa bàn hoạt động</span>
            <p className="font-medium text-sm md:text-base text-white">
              {currentProfile.location}
            </p>
          </div>
        </div>

        {/* Bottom Bar: Clean editorial navigation (Admin link hidden for pure client presentation) */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-white/60">
          <div className="flex flex-wrap items-center gap-2 font-medium">
            <span className="font-bricolage font-extrabold text-white uppercase tracking-[-0.02em]">TRẦN QUỐC VINH</span>
            <span className="text-white/30">·</span>
            <span>VIDEOGRAPHER · EDITOR · MOTION</span>
            <span className="text-white/30">·</span>
            <span className="tabular-nums">© 2026</span>
          </div>

          <div className="flex items-center gap-6 font-semibold text-white/80">
            <a href="#du-an" className="hover:text-white hover:underline underline-offset-4 decoration-[#3B82F6]/60 transition-colors">
              Dự án
            </a>
            <a href="#dich-vu" className="hover:text-white hover:underline underline-offset-4 decoration-[#3B82F6]/60 transition-colors">
              Dịch vụ Agency
            </a>
            <a href="#ho-so" className="hover:text-white hover:underline underline-offset-4 decoration-[#3B82F6]/60 transition-colors">
              Hồ sơ
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
