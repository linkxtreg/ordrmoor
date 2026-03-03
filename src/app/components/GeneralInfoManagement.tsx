import { memo, useState, useEffect } from 'react';
import { Phone, Flag, Facebook, Instagram, MessageCircle, Music, Palette } from 'lucide-react';
import { GeneralInfo } from '../types/menu';
import { ImageUpload } from './ImageUpload';
import { BackgroundImageUpload } from './BackgroundImageUpload';
import { useTenant } from '../context/TenantContext';
import { useAdminLanguage } from '../context/AdminLanguageContext';

interface GeneralInfoManagementProps {
  generalInfo: GeneralInfo;
  onUpdate: (generalInfo: GeneralInfo) => void;
}

export const GeneralInfoManagement = memo(function GeneralInfoManagement({ generalInfo, onUpdate }: GeneralInfoManagementProps) {
  const [formData, setFormData] = useState<GeneralInfo>(generalInfo);
  const { tenantName } = useTenant();
  const { t } = useAdminLanguage();

  useEffect(() => {
    setFormData(generalInfo);
  }, [generalInfo]);

  const handleChange = (field: keyof GeneralInfo, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSocialMediaChange = (platform: keyof GeneralInfo['socialMedia'], value: string) => {
    setFormData((prev) => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  const handleReset = () => {
    setFormData(generalInfo);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-600 mt-1">
          {t('generalInfo.header', { name: tenantName || '' })}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Images Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 space-y-6">
          <h3 className="text-base font-semibold text-gray-900">{t('generalInfo.images')}</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('generalInfo.backgroundImage')}
              </label>
              <BackgroundImageUpload
                value={formData.backgroundImage}
                onChange={(url) => handleChange('backgroundImage', url)}
              />
              <p className="text-xs text-gray-500 mt-2">
                {t('generalInfo.backgroundImageHint')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('generalInfo.logoImage')}
              </label>
              <ImageUpload
                value={formData.logoImage}
                onChange={(url) => handleChange('logoImage', url)}
                uploadOptions={{
                  maxWidth: 900,
                  maxHeight: 900,
                  quality: 0.88,
                  minQuality: 0.78,
                  targetMaxBytes: 170 * 1024, // ~170KB with quality floor for crisp branding
                }}
              />
              <p className="text-xs text-gray-500 mt-2">
                {t('generalInfo.logoImageHint', { name: tenantName || '' })}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Info Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900">{t('generalInfo.contactInfo')}</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('generalInfo.phoneNumber')}
            </label>
            <input
              type="text"
              value={formData.phoneNumber}
              onChange={(e) => handleChange('phoneNumber', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder={t('generalInfo.phonePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('generalInfo.tagline')}
            </label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => handleChange('tagline', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder={t('generalInfo.taglinePlaceholder')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Palette size={16} />
                {t('generalInfo.brandColor')}
              </div>
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={formData.brandColor}
                onChange={(e) => handleChange('brandColor', e.target.value)}
                className="h-10 w-16 sm:w-20 rounded-lg border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={formData.brandColor}
                onChange={(e) => handleChange('brandColor', e.target.value)}
                className="flex-1 px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                placeholder={t('generalInfo.brandColorPlaceholder')}
                pattern="^#[0-9A-Fa-f]{6}$"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {t('generalInfo.brandColorHint')}
            </p>
          </div>
        </div>

        {/* Social Media Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900">{t('generalInfo.socialMedia')}</h3>
          <p className="text-sm text-gray-600">
            {t('generalInfo.socialMediaHint')}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Facebook size={16} />
                  {t('generalInfo.facebook')}
                </div>
              </label>
              <input
                type="url"
                value={formData.socialMedia.facebook}
                onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder={t('generalInfo.facebookPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Instagram size={16} />
                  {t('generalInfo.instagram')}
                </div>
              </label>
              <input
                type="url"
                value={formData.socialMedia.instagram}
                onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder={t('generalInfo.instagramPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Music size={16} />
                  {t('generalInfo.tiktok')}
                </div>
              </label>
              <input
                type="url"
                value={formData.socialMedia.tiktok}
                onChange={(e) => handleSocialMediaChange('tiktok', e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder={t('generalInfo.tiktokPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <MessageCircle size={16} />
                  {t('generalInfo.messenger')}
                </div>
              </label>
              <input
                type="url"
                value={formData.socialMedia.messenger}
                onChange={(e) => handleSocialMediaChange('messenger', e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder={t('generalInfo.messengerPlaceholder')}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium order-2 sm:order-1"
          >
            {t('generalInfo.reset')}
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm order-1 sm:order-2"
          >
            {t('generalInfo.saveChanges')}
          </button>
        </div>
      </form>
    </div>
  );
});