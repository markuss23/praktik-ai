'use client';

import { useState } from 'react';

interface AccountFormValues {
  firstName: string;
  lastName: string;
  email: string;
}

interface AccountSettingsCardProps {
  initialValues?: Partial<AccountFormValues>;
  onSave?: (values: AccountFormValues) => void;
  onChangePassword?: () => void;
}

export function AccountSettingsCard({
  initialValues = {},
  onSave,
  onChangePassword,
}: AccountSettingsCardProps) {
  const [values, setValues] = useState<AccountFormValues>({
    firstName: initialValues.firstName ?? '',
    lastName: initialValues.lastName ?? '',
    email: initialValues.email ?? '',
  });

  function handleChange(field: keyof AccountFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave?.(values);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Nastavení účtu</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Row: Jméno + Příjmení */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-500 font-medium">Jméno</label>
            <input
              type="text"
              value={values.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition"
              placeholder=""
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-500 font-medium">Příjmení</label>
            <input
              type="text"
              value={values.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition"
              placeholder=""
            />
          </div>
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-gray-500 font-medium">Email</label>
          <input
            type="email"
            value={values.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition"
            placeholder=""
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-1">
          <button
            type="button"
            onClick={onChangePassword}
            className="px-4 py-2 text-sm font-semibold text-gray-800 bg-transparent hover:bg-gray-50 rounded-lg transition"
          >
            Změnit heslo
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-semibold text-white bg-green-500 hover:bg-green-600 rounded-lg transition shadow-sm"
          >
            Uložit změny
          </button>
        </div>
      </form>
    </div>
  );
}
