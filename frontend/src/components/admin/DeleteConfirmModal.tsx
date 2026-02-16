'use client';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  isModule: boolean;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  isOpen,
  isModule,
  deleting,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-black">Potvrdit smazání</h2>
        <p className="text-gray-700 mb-6">
          {isModule
            ? 'Opravdu chcete smazat tento modul? Tato akce je nevratná.'
            : 'Opravdu chcete smazat tento kurz a všechny jeho moduly? Tato akce je nevratná.'
          }
        </p>
        <div className="flex gap-4">
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
          >
            {deleting ? 'Mazání...' : 'Ano, smazat'}
          </button>
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Zrušit
          </button>
        </div>
      </div>
    </div>
  );
}
