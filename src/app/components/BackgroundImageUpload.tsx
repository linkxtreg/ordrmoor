import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { imageApi } from '../services/api';
import { toast } from 'sonner';
import { MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES, ACCEPT_IMAGES } from '../constants/upload';

interface BackgroundImageUploadProps {
  value: string;
  onChange: (imageUrl: string) => void;
}

export function BackgroundImageUpload({ value, onChange }: BackgroundImageUploadProps) {
  const [preview, setPreview] = useState<string>(value);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast.error('Please upload a PNG, JPEG, or WebP image');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error('File is too large. Please upload an image smaller than 10MB.');
        return;
      }

      try {
        setIsUploading(true);

        // Create preview immediately for better UX
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload to server
        const imageUrl = await imageApi.upload(file, {
          maxWidth: 1200,
          maxHeight: 800,
          quality: 0.82,
          minQuality: 0.72,
          targetMaxBytes: 200 * 1024, // ~200KB for LCP hero/background
        });
        setPreview(imageUrl);
        onChange(imageUrl);
        toast.success('Background image uploaded successfully');
      } catch (error) {
        console.error('Error uploading background image:', error);
        toast.error('Failed to upload background image');
        setPreview(value); // Revert to previous image
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemove = () => {
    setPreview('');
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div>
      <div className="relative">
        {preview ? (
          <div className="relative w-full max-w-[400px] h-[300px] border-2 border-gray-200 rounded-xl overflow-hidden group">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <p className="text-white text-sm font-medium">Uploading...</p>
                </div>
              </div>
            )}
            {!isUploading && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6 gap-3">
                <button
                  type="button"
                  onClick={handleClick}
                  className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 font-medium shadow-lg text-sm"
                >
                  <Upload size={16} />
                  Change
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors flex items-center gap-2 font-medium shadow-lg text-sm"
                >
                  <X size={16} />
                  Remove
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            disabled={isUploading}
            className="w-full max-w-[400px] h-[300px] border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/50 transition-all flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-indigo-600 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-gray-600">Uploading...</p>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-full bg-gray-100 group-hover:bg-indigo-100 transition-colors">
                  <ImageIcon size={32} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <div className="text-center px-4">
                  <p className="text-sm font-medium">Click to upload background image</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPEG, WebP up to 10MB</p>
                </div>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_IMAGES}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}