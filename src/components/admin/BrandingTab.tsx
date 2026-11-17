import { useId, useMemo, useRef, useState } from 'react';
import {
  Upload,
  Code2,
  Sparkles,
  Search,
  Check,
  Globe,
  Sliders,
  Eye,
  Trash2,
  Layers,
} from 'lucide-react';
import type { SiteBrandingData } from '../../types/portfolio';
import { BRANDING_PRESETS } from '../../data/brandingPresets';
import {
  cleanSvgWhiteBackground,
  generateFaviconSvg,
  invertSvgColors,
  svgToDataUrl,
  autoCropSvgViewBox,
} from '../../utils/brandingLogic';

interface BrandingTabProps {
  branding?: SiteBrandingData;
  onChange: (partial: Partial<SiteBrandingData>) => void;
  onMarkUnsaved?: () => void;
}

export function BrandingTab({ branding, onChange, onMarkUnsaved }: BrandingTabProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputMode, setInputMode] = useState<'upload' | 'code'>('upload');
  const [previewStageDark, setPreviewStageDark] = useState(true);

  // Safe defaults
  const currentBranding: SiteBrandingData = useMemo(() => ({
    logoSvg: BRANDING_PRESETS[0].svg,
    brandName: 'VINH TRẦN',
    showBrandName: true,
    logoHeight: 24,
    autoRemoveWhiteBg: true,
    invertNavbarColor: true,
    faviconDarkSquare: true,
    faviconPadding: 12,
    faviconTheme: 'dark',
    ...branding,
  }), [branding]);

  // Compute processed SVG for Navbar Preview
  const processedNavbarSvg = useMemo(() => {
    if (!currentBranding.logoSvg) return null;
    let svg = currentBranding.logoSvg;

    if (currentBranding.autoRemoveWhiteBg) {
      svg = cleanSvgWhiteBackground(svg);
    }

    // Tự động cắt sát viewBox để biểu tượng trên Navbar không bị thu nhỏ
    svg = autoCropSvgViewBox(svg);

    if (previewStageDark && currentBranding.invertNavbarColor) {
      svg = invertSvgColors(svg, '#F7F6F2');
    } else if (!previewStageDark && currentBranding.invertNavbarColor) {
      svg = invertSvgColors(svg, '#111111');
    }

    const height = currentBranding.logoHeight || 24;
    svg = svg.replace(/<svg\b([^>]*)>/i, (_match, attrs) => {
      const cleanAttrs = attrs
        .replace(/\bwidth\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\bheight\s*=\s*["'][^"']*["']/gi, '')
        .trim();
      return `<svg ${cleanAttrs} style="height: ${height}px; width: auto; max-height: 100%; display: block;">`;
    });
    return svg;
  }, [
    currentBranding.logoSvg,
    currentBranding.autoRemoveWhiteBg,
    currentBranding.invertNavbarColor,
    currentBranding.logoHeight,
    previewStageDark,
  ]);

  // Compute Favicon SVG for Browser Tab Preview
  const faviconSvg = useMemo(() => {
    if (!currentBranding.logoSvg) return '';
    return generateFaviconSvg(currentBranding.logoSvg, {
      darkSquare: currentBranding.faviconDarkSquare,
      padding: currentBranding.faviconPadding,
      autoRemoveWhite: currentBranding.autoRemoveWhiteBg,
      theme: currentBranding.faviconTheme || 'dark',
    });
  }, [
    currentBranding.logoSvg,
    currentBranding.faviconDarkSquare,
    currentBranding.faviconPadding,
    currentBranding.autoRemoveWhiteBg,
    currentBranding.faviconTheme,
  ]);

  const faviconDataUrl = useMemo(() => {
    return svgToDataUrl(faviconSvg);
  }, [faviconSvg]);

  // Handle file upload (.svg or .png)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text && text.includes('<svg')) {
          // Tự động gỡ nền trắng và cắt sát viền thực tế của SVG khi tải lên
          const cropped = autoCropSvgViewBox(cleanSvgWhiteBackground(text));
          onChange({
            logoSvg: cropped,
            logoDataUrl: undefined,
          });
          onMarkUnsaved?.();
        }
      };
      reader.readAsText(file);
    } else {
      // PNG or raster image: convert to data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        onChange({
          logoDataUrl: dataUrl,
          logoSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><image href="${dataUrl}" width="100" height="100"/></svg>`,
        });
        onMarkUnsaved?.();
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyPreset = (presetSvg: string) => {
    const cropped = autoCropSvgViewBox(presetSvg);
    onChange({ logoSvg: cropped, logoDataUrl: undefined });
    onMarkUnsaved?.();
  };

  const handleAutoCropCode = () => {
    if (!currentBranding.logoSvg) return;
    const cropped = autoCropSvgViewBox(currentBranding.logoSvg);
    onChange({ logoSvg: cropped, logoDataUrl: undefined });
    onMarkUnsaved?.();
  };

  const inputClass =
    'w-full bg-[#F9F9FB] border border-black/10 rounded-xl px-4 py-3 text-sm text-[#111111] focus:bg-white focus:border-[#111111] focus:ring-2 focus:ring-black/5 focus:outline-none transition-all placeholder:text-black/35';

  return (
    <div className="w-full py-4 space-y-8">
      {/* Intro Header */}
      <div className="bg-white rounded-2xl border border-black/[0.07] p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/5 text-[#111111] text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Thương hiệu, Logo &amp; Favicon</span>
          </div>
          <h2 className="font-bricolage text-xl sm:text-2xl font-bold text-[#111111] uppercase tracking-tight">
            Quản trị nhận diện thương hiệu Studio
          </h2>
          <p className="text-xs sm:text-sm text-black/60 leading-relaxed max-w-2xl">
            Tải lên biểu tượng vector SVG hoặc hình ảnh thương hiệu. Hệ thống tự động xử lý tách nền trong suốt, tối ưu tương phản trên thanh điều hướng tối và tạo bộ Favicon đa kích thước cho tab trình duyệt.
          </p>
        </div>
      </div>

      {/* Main 2-Column Grid: Settings (Left 7 cols) & Live Previews (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* CỘT TRÁI: CÔNG CỤ TẢI LÊN & 4 TÙY CHỌN CHỈNH SỬA */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Tải file & Mã nguồn SVG */}
          <div className="bg-white rounded-2xl border border-black/[0.07] p-6 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bricolage text-base font-bold text-[#111111] uppercase tracking-tight">
                  1. Tải lên biểu tượng Logo &amp; Favicon
                </h3>
                <p className="text-xs text-black/55 mt-0.5">
                  Hỗ trợ định dạng vector <code className="text-black/80 font-bold">.svg</code> hoặc hình ảnh <code className="text-black/80 font-bold">.png</code> trong suốt.
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="inline-flex p-1 bg-black/[0.05] rounded-xl border border-black/[0.05] text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setInputMode('upload')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    inputMode === 'upload' ? 'bg-white text-[#111111] shadow-2xs font-bold' : 'text-black/60 hover:text-black'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 inline mr-1" />
                  <span>File ảnh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('code')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    inputMode === 'code' ? 'bg-white text-[#111111] shadow-2xs font-bold' : 'text-black/60 hover:text-black'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5 inline mr-1" />
                  <span>Mã SVG</span>
                </button>
              </div>
            </div>

            {inputMode === 'upload' ? (
              <div>
                <input
                  ref={fileInputRef}
                  id={fileInputId}
                  type="file"
                  accept=".svg,.png,image/svg+xml,image/png"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor={fileInputId}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-black/15 hover:border-black/35 rounded-2xl p-6 sm:p-8 bg-[#F9F9FB] hover:bg-[#F2F2F5] transition-all cursor-pointer group text-center space-y-2.5"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white border border-black/10 shadow-xs flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-[#111111]">
                      Nhấp để chọn file hoặc kéo thả logo vào đây
                    </p>
                    <p className="text-[11px] text-black/50 mt-1">
                      Định dạng khuyến nghị: SVG vector chuẩn để icon sắc nét tối đa ở mọi tỉ lệ
                    </p>
                  </div>
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-black/70">
                    Mã nguồn thẻ &lt;svg&gt;...&lt;/svg&gt;
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoCropCode}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-black/5 hover:bg-black/10 text-[#111111] border border-black/10 transition-colors cursor-pointer"
                    title="Tự động tính toán getBBox() và cắt bỏ khoảng trắng thừa quanh biểu tượng"
                  >
                    <span>Cắt sát viền biểu tượng (Auto-crop)</span>
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={currentBranding.logoSvg || ''}
                  onChange={(e) => {
                    onChange({ logoSvg: e.target.value, logoDataUrl: undefined });
                    onMarkUnsaved?.();
                  }}
                  placeholder="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1024 1024'>...</svg>"
                  className="w-full bg-[#18181B] text-emerald-400 font-mono text-xs rounded-xl p-4 leading-relaxed focus:ring-2 focus:ring-black/20 focus:outline-none border border-black/10 resize-y"
                  spellCheck={false}
                />
              </div>
            )}

            {/* Presets */}
            <div className="pt-3 border-t border-black/8 space-y-2.5">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-black/55">
                Mẫu logo biểu tượng có sẵn (Presets):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {BRANDING_PRESETS.map((preset) => {
                  const isCurrent = currentBranding.logoSvg === preset.svg;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset.svg)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isCurrent
                          ? 'border-[#111111] bg-black/[0.03] ring-1 ring-black/10'
                          : 'border-black/10 hover:border-black/25 bg-[#F9F9FB]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="w-7 h-7 rounded-lg bg-[#111111] p-1 flex items-center justify-center shrink-0"
                          dangerouslySetInnerHTML={{
                            __html: preset.svg.replace(
                              /<svg\b([^>]*)>/i,
                              '<svg $1 style="width:100%;height:100%;fill:#F7F6F2;display:block;">'
                            ),
                          }}
                        />
                        {isCurrent && <Check className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#111111] truncate">{preset.name}</p>
                        <p className="text-[10px] text-black/50 line-clamp-1 mt-0.5">{preset.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 2: 4 Công cụ chỉnh sửa nhanh trực quan */}
          <div className="bg-white rounded-2xl border border-black/[0.07] p-6 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-6">
            <h3 className="font-bricolage text-base font-bold text-[#111111] uppercase tracking-tight">
              2. Bốn công cụ tinh chỉnh nhận diện &amp; hiển thị
            </h3>

            {/* Công cụ 1: Tự động xóa nền trắng SVG */}
            <div className="flex items-start justify-between gap-4 pb-5 border-b border-black/8">
              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-bold text-[#111111] cursor-pointer block">
                  Tự động xóa nền trắng SVG
                </label>
                <p className="text-xs text-black/60 leading-relaxed">
                  Tự động nhận diện và gỡ bỏ thẻ <code className="text-black/80 font-bold">&lt;rect&gt;</code> hoặc <code className="text-black/80 font-bold">&lt;path&gt;</code> màu trắng bao quanh file để logo đạt độ trong suốt hoàn hảo trên mọi nền màu.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={currentBranding.autoRemoveWhiteBg}
                onClick={() => {
                  onChange({ autoRemoveWhiteBg: !currentBranding.autoRemoveWhiteBg });
                  onMarkUnsaved?.();
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  currentBranding.autoRemoveWhiteBg ? 'bg-[#111111]' : 'bg-black/15'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    currentBranding.autoRemoveWhiteBg ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Công cụ 2: Đảo màu sáng trên thanh Menu tối */}
            <div className="flex items-start justify-between gap-4 pb-5 border-b border-black/8">
              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-bold text-[#111111] cursor-pointer block">
                  Đảo màu sáng trên thanh Menu tối
                </label>
                <p className="text-xs text-black/60 leading-relaxed">
                  Tự động chuyển các nét màu đen/tối của biểu tượng sang màu trắng kem <code className="text-black/80 font-bold">#F7F6F2</code> khi hiển thị trên thanh Navbar nền đen hoặc ảnh nền Hero.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={currentBranding.invertNavbarColor}
                onClick={() => {
                  onChange({ invertNavbarColor: !currentBranding.invertNavbarColor });
                  onMarkUnsaved?.();
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  currentBranding.invertNavbarColor ? 'bg-[#111111]' : 'bg-black/15'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    currentBranding.invertNavbarColor ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Công cụ 3: Đóng khung nền cho Favicon & Thanh chỉnh padding */}
            <div className="space-y-4 pb-5 border-b border-black/8">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-bold text-[#111111] cursor-pointer block">
                    Đóng khung nền cho Favicon
                  </label>
                  <p className="text-xs text-black/60 leading-relaxed">
                    Tự động tạo bản SVG Favicon với nền vuông bo góc nhẹ chuẩn Studio (<code className="text-black/80 font-bold">rx="14"</code>) và đặt biểu tượng ở trung tâm sắc nét.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={currentBranding.faviconDarkSquare}
                  onClick={() => {
                    onChange({ faviconDarkSquare: !currentBranding.faviconDarkSquare });
                    onMarkUnsaved?.();
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    currentBranding.faviconDarkSquare ? 'bg-[#111111]' : 'bg-black/15'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      currentBranding.faviconDarkSquare ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {currentBranding.faviconDarkSquare && (
                <div className="p-4 rounded-xl bg-[#F9F9FB] border border-black/10 space-y-4">
                  {/* Phối màu khung Favicon */}
                  <div className="space-y-2">
                    <span className="block text-xs font-bold text-[#111111]">
                      Phối màu khung Favicon:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onChange({ faviconTheme: 'dark' });
                          onMarkUnsaved?.();
                        }}
                        className={`p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          (currentBranding.faviconTheme || 'dark') === 'dark'
                            ? 'border-[#111111] bg-black/5 ring-1 ring-black/10'
                            : 'border-black/10 bg-white hover:border-black/25'
                        }`}
                      >
                        <div className="w-5 h-5 rounded-md bg-[#111111] border border-white/20 flex items-center justify-center text-[10px] text-[#F7F6F2] font-bold">
                          ●
                        </div>
                        <div className="text-xs">
                          <span className="font-bold text-[#111111] block">Nền tối Studio</span>
                          <span className="text-[10px] text-black/50">Nền #111111 · Icon kem #F7F6F2</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onChange({ faviconTheme: 'light' });
                          onMarkUnsaved?.();
                        }}
                        className={`p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          currentBranding.faviconTheme === 'light'
                            ? 'border-[#111111] bg-black/5 ring-1 ring-black/10'
                            : 'border-black/10 bg-white hover:border-black/25'
                        }`}
                      >
                        <div className="w-5 h-5 rounded-md bg-[#F7F6F2] border border-black/20 flex items-center justify-center text-[10px] text-[#111111] font-bold">
                          ●
                        </div>
                        <div className="text-xs">
                          <span className="font-bold text-[#111111] block">Nền kem tương phản</span>
                          <span className="text-[10px] text-black/50">Nền #F7F6F2 · Icon đen #111111</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Thanh chỉnh khoảng đệm (Padding) */}
                  <div className="space-y-2 pt-2 border-t border-black/8">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#111111]">
                        Khoảng đệm biểu tượng trong Favicon (Padding):
                      </span>
                      <span className="font-mono font-bold text-[#111111]">
                        {currentBranding.faviconPadding}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="25"
                      step="1"
                      value={currentBranding.faviconPadding}
                      onChange={(e) => {
                        onChange({ faviconPadding: Number(e.target.value) });
                        onMarkUnsaved?.();
                      }}
                      className="w-full accent-[#111111] cursor-pointer h-1.5 bg-black/15 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[10px] text-black/45">
                      <span>8% (Biểu tượng lớn)</span>
                      <span>12% (Chuẩn Studio đề xuất)</span>
                      <span>20% (Thoáng mắt)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Công cụ 4: Kích thước Logo trên Navbar & Tên thương hiệu */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <label className="font-bold text-[#111111]">
                    Kích thước chiều cao Logo trên thanh Menu:
                  </label>
                  <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-black/5 text-[#111111]">
                    {currentBranding.logoHeight}px
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="32"
                  step="1"
                  value={currentBranding.logoHeight}
                  onChange={(e) => {
                    onChange({ logoHeight: Number(e.target.value) });
                    onMarkUnsaved?.();
                  }}
                  className="w-full accent-[#111111] cursor-pointer h-1.5 bg-black/15 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] text-black/45">
                  <span>20px (Nhỏ gọn)</span>
                  <span>24px (Mặc định)</span>
                  <span>32px (Nổi bật)</span>
                </div>
              </div>

              {/* Tên thương hiệu hiển thị cạnh logo */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-black/70 mb-1.5">
                    Tên thương hiệu hiển thị cạnh logo
                  </label>
                  <input
                    type="text"
                    value={currentBranding.brandName}
                    onChange={(e) => {
                      onChange({ brandName: e.target.value });
                      onMarkUnsaved?.();
                    }}
                    className={`${inputClass} font-bold`}
                    placeholder="VINH TRẦN"
                  />
                </div>

                <div className="flex items-center gap-2 pb-3">
                  <input
                    id="showBrandNameCheck"
                    type="checkbox"
                    checked={currentBranding.showBrandName}
                    onChange={(e) => {
                      onChange({ showBrandName: e.target.checked });
                      onMarkUnsaved?.();
                    }}
                    className="w-4 h-4 rounded-md accent-[#111111] cursor-pointer"
                  />
                  <label htmlFor="showBrandNameCheck" className="text-xs font-semibold text-[#111111] cursor-pointer select-none">
                    Hiện chữ cạnh logo
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: KHUNG XEM TRƯỚC TRỰC TIẾP (LIVE PREVIEW) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-[128px]">
          {/* Preview Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#2563EB]" />
              <h3 className="font-bricolage text-sm font-bold text-[#111111] uppercase tracking-wider">
                Xem trước thực tế (Live Preview)
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Thời gian thực
            </span>
          </div>

          {/* MÔ PHỎNG 1: TAB TRÌNH DUYỆT (BROWSER TAB) */}
          <div className="bg-white rounded-2xl border border-black/[0.07] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-0">
            <div className="px-4 py-3 bg-[#E5E5EB] border-b border-black/10 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                <span className="ml-2 text-[10px] font-bold text-black/50 tracking-wider uppercase">
                  Browser Tab
                </span>
              </div>
              <span className="text-[10px] font-mono text-black/45">16 × 16px</span>
            </div>

            {/* Tab Chrome */}
            <div className="p-4 bg-[#F2F2F5] border-b border-black/8 flex items-center">
              {/* Active Tab */}
              <div className="max-w-[260px] bg-white rounded-t-xl px-3 py-2 flex items-center gap-2 shadow-xs border-t border-x border-black/10 text-xs">
                {/* 16x16 Favicon Real Size */}
                <div className="w-4 h-4 shrink-0 overflow-hidden flex items-center justify-center">
                  {faviconDataUrl ? (
                    <img
                      src={faviconDataUrl}
                      alt="Favicon preview"
                      className="w-4 h-4 object-contain"
                    />
                  ) : (
                    <Globe className="w-4 h-4 text-black/40" />
                  )}
                </div>

                {/* Page Title */}
                <span className="truncate text-xs font-medium text-[#111111]">
                  {currentBranding.brandName || 'VINH TRẦN'} — Videographer
                </span>

                {/* Close Tab X */}
                <span className="text-black/35 hover:text-black/70 text-xs shrink-0 cursor-pointer ml-auto">
                  ×
                </span>
              </div>
            </div>

            {/* Magnifier Loupe 8x to inspect favicon clarity */}
            <div className="p-4 bg-white flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-[#111111]">Kính lúp kiểm tra Favicon (Zoom 8x):</p>
                <p className="text-[11px] text-black/50">
                  Hiển thị độ nét chi tiết khi xuất sang icon trình duyệt
                </p>
              </div>

              <div className="w-16 h-16 rounded-2xl bg-[#222226] p-1.5 shadow-md flex items-center justify-center border border-black/15 shrink-0">
                {faviconSvg && (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: faviconSvg }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* MÔ PHỎNG 2: THANH ĐIỀU HƯỚNG (NAVBAR PREVIEW) */}
          <div className="bg-white rounded-2xl border border-black/[0.07] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-0">
            <div className="px-4 py-3 bg-[#E5E5EB] border-b border-black/10 flex items-center justify-between">
              <span className="text-[10px] font-bold text-black/60 uppercase tracking-wider">
                Mô phỏng góc trái Menu (Navbar)
              </span>

              {/* Toggle Dark/Light stage preview */}
              <button
                type="button"
                onClick={() => setPreviewStageDark(!previewStageDark)}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-black/15 bg-white text-[#111111] hover:bg-black/5 cursor-pointer"
              >
                {previewStageDark ? 'Đổi sang nền sáng' : 'Đổi sang nền tối'}
              </button>
            </div>

            {/* Simulated Navbar Container */}
            <div
              className={`p-5 transition-colors ${
                previewStageDark
                  ? 'bg-[#0B0B0D] text-white border-b border-white/10'
                  : 'bg-[#F7F6F2] text-[#111111] border-b border-black/10'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Brand Logo & Name */}
                <div className="flex items-center gap-2.5">
                  {processedNavbarSvg ? (
                    <div
                      className="shrink-0 flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: processedNavbarSvg }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                      V
                    </div>
                  )}

                  {currentBranding.showBrandName && (
                    <span
                      className={`font-bricolage text-base sm:text-lg tracking-[-0.03em] font-extrabold uppercase ${
                        previewStageDark ? 'text-white' : 'text-[#111111]'
                      }`}
                    >
                      {currentBranding.brandName || 'VINH TRẦN'}
                    </span>
                  )}
                </div>

                {/* Clock / Location pill preview */}
                <div
                  className={`hidden sm:flex items-center gap-1.5 text-xs font-medium ${
                    previewStageDark ? 'text-white/75' : 'text-black/70'
                  }`}
                >
                  <span>TP.HCM</span>
                  <span className={previewStageDark ? 'text-white/30' : 'text-black/30'}>·</span>
                  <span className="tabular-nums font-semibold">17:36:45</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
