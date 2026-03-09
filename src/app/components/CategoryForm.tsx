import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Category } from '../types/menu';
import { useAdminLanguage } from '../context/AdminLanguageContext';

interface CategoryFormProps {
  category: Category | null;
  onSubmit: (category: Category) => void;
  onCancel: () => void;
}

const defaultColor = '#6366f1';

export function CategoryForm({ category, onSubmit, onCancel }: CategoryFormProps) {
  const { t } = useAdminLanguage();
  const [formData, setFormData] = useState<Category>({
    id: '',
    name: '',
    color: defaultColor,
    description: '',
    nameAr: '',
    descriptionEn: '',
  });

  useEffect(() => {
    if (category) {
      setFormData({
        ...category,
        nameAr: category.nameAr ?? '',
        descriptionEn: category.descriptionEn ?? '',
      });
    } else {
      setFormData({
        id: '',
        name: '',
        color: defaultColor,
        description: '',
        nameAr: '',
        descriptionEn: '',
      });
    }
  }, [category]);

  const handleChange = (field: keyof Category, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submittedCategory: Category = {
      ...formData,
      id: category?.id || Date.now().toString(),
      color: formData.color || defaultColor,
    };
    onSubmit(submittedCategory);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {category ? t('categoryForm.editCategory') : t('categoryForm.addNew')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {category ? t('categoryForm.updateDesc') : t('categoryForm.createDesc')}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            {/* Category Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('categoryForm.categoryName')}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder={t('categoryForm.categoryNamePlaceholder')}
                required
              />
            </div>

            {/* Category Name AR */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('categoryForm.categoryNameAr')}
              </label>
              <input
                type="text"
                dir="rtl"
                value={formData.nameAr ?? ''}
                onChange={(e) => handleChange('nameAr', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder={t('categoryForm.categoryNameArPlaceholder')}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              {t('categoryForm.cancel')}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
            >
              {category ? t('categoryForm.update') : t('categoryForm.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
