'use client';

import { categoriesApi } from "@/lib/api-client";
import { Category } from "@/api";
import React, { useState, useEffect, useCallback } from "react";
import { useRole } from "@/hooks/useRole";
import { useRouter } from "next/navigation";

type ModalType = 'category-create' | null;

export function CategoriesListView() {
  const router = useRouter();
  const { can } = useRole();

  useEffect(() => {
    if (!can('superadmin')) {
      router.replace('/admin');
    }
  }, [can, router]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [formData, setFormData] = useState({ name: '', description: '' });

  const loadCategories = useCallback(async () => {
    try {
      const data = await categoriesApi.listCategories({ includeInactive: true });
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleDeleteClick = (categoryId: number) => {
    setCategoryToDelete(categoryId);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setDeleting(true);
    try {
      await categoriesApi.deleteCategory({ categoryId: categoryToDelete });
      await loadCategories();
      setShowDeleteConfirm(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Nepodařilo se smazat kategorii');
    } finally {
      setDeleting(false);
    }
  };

  const openCreateModal = () => {
    setFormData({ name: '', description: '' });
    setModalError('');
    setActiveModal('category-create');
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');
    try {
      await categoriesApi.createCategory({
        categoryCreate: {
          name: formData.name,
          description: formData.description || undefined,
        },
      });
      await loadCategories();
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Nepodařilo se vytvořit kategorii');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <>
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-lg shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 border-b">
            <h2 className="text-xl sm:text-2xl font-bold text-black">Přehled kategorií</h2>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium whitespace-nowrap"
            >
              Přidat kategorii
            </button>
          </div>

          {/* Table - Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Název kategorie</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Popis</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Aktivní</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Akce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category.categoryId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{category.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{category.description || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                        category.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {category.isActive ? 'Aktivní' : 'Neaktivní'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteClick(category.categoryId)}
                        className="text-red-600 hover:text-red-800 hover:underline text-sm"
                      >
                        Smazat
                      </button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">
                      Žádné kategorie nenalezeny
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-200">
            {categories.map((category) => (
              <div key={category.categoryId} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{category.name}</h3>
                    {category.description && (
                      <p className="text-sm text-gray-500 mt-1 truncate">{category.description}</p>
                    )}
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full mt-2 ${
                      category.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {category.isActive ? 'Aktivní' : 'Neaktivní'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteClick(category.categoryId)}
                    className="text-red-600 hover:text-red-800 text-sm flex-shrink-0"
                  >
                    Smazat
                  </button>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">
                Žádné kategorie nenalezeny
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Category Modal */}
      {activeModal === 'category-create' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-black">Přidat kategorii</h2>
            {modalError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                {modalError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Název kategorie *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm"
                  placeholder="např. Programování"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Popis
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm"
                  placeholder="Stručný popis kategorie..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm"
                >
                  {modalLoading ? 'Ukládání...' : 'Vytvořit'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                >
                  Zrušit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteCategoryModal
        isOpen={showDeleteConfirm}
        deleting={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setCategoryToDelete(null);
        }}
      />
    </>
  );
}

function DeleteCategoryModal({
  isOpen,
  deleting,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full shadow-xl">
        <h2 className="text-lg sm:text-xl font-bold mb-3 text-black">Potvrdit smazání</h2>
        <p className="text-gray-700 mb-6 text-sm sm:text-base">
          Opravdu chcete smazat tuto kategorii? Tato akce je nevratná.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 text-sm"
          >
            {deleting ? 'Mazání...' : 'Ano, smazat'}
          </button>
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
          >
            Zrušit
          </button>
        </div>
      </div>
    </div>
  );
}

export default CategoriesListView;
