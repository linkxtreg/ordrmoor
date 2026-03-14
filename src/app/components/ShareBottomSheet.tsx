import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X } from 'lucide-react';
import { toast } from 'sonner';

const strings = {
  en: {
    copyLink: 'Copy Link',
    shareLink: 'Share Link',
    copied: 'Copied',
  },
  ar: {
    copyLink: 'نسخ الرابط',
    shareLink: 'مشاركة الرابط',
    copied: 'تم النسخ',
  },
};

interface ShareBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string;
  language: 'ar' | 'en';
  brandColor: string;
}

export function ShareBottomSheet({
  open,
  onOpenChange,
  shareUrl,
  language,
  brandColor,
}: ShareBottomSheetProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const s = strings[language];
  const isRtl = language === 'ar';

  useEffect(() => {
    if (!open || !shareUrl) return;
    QRCode.toDataURL(shareUrl, { width: 256, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [open, shareUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(s.copied, { duration: 1000 });
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleShareLink = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          url: shareUrl,
          title: 'Menu',
          text: 'Check out this menu',
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error('Share failed');
        }
      }
    } else {
      handleCopyLink();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Overlay - covers viewport */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        aria-hidden
        onClick={() => onOpenChange(false)}
      />

      {/* Sheet content - fixed to viewport bottom, centered to match content width */}
      <div
        className="fixed inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto bg-white rounded-t-2xl px-6 pb-8 pt-4 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom duration-300 max-w-[600px] mx-auto"
        dir={isRtl ? 'rtl' : 'ltr'}
        role="dialog"
        aria-modal="true"
        aria-label={isRtl ? 'مشاركة' : 'Share'}
      >
        {/* Header: close button on the left */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 -m-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label={isRtl ? 'إغلاق' : 'Close'}
          >
            <X className="size-5 text-gray-600" />
          </button>
          <div className="flex-1" />
        </div>

        {/* QR code - centered square */}
        <div className="flex flex-col items-center gap-6">
          <div className="w-[200px] h-[200px] rounded-xl border border-gray-200 bg-white p-3 flex items-center justify-center overflow-hidden">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR code"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 animate-pulse rounded" />
            )}
          </div>

          {/* Two buttons side by side */}
          <div className="flex gap-3 w-full max-w-[320px]">
            <button
              onClick={handleCopyLink}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm uppercase tracking-wider text-white shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
              style={{ backgroundColor: brandColor }}
            >
              {s.copyLink}
            </button>
            <button
              onClick={handleShareLink}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm uppercase tracking-wider border-2 transition-all hover:bg-gray-50 active:scale-[0.98]"
              style={{ borderColor: brandColor, color: brandColor }}
            >
              {s.shareLink}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
