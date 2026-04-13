'use client';

import { useState, useEffect } from 'react';
import {
  listSystemSettings,
  updateSystemSetting,
  type SystemSettingResponse,
  type SystemSettingUpdate,
} from '@/lib/api-client';
import { Save, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { AiMentorSkeleton } from '@/components/ui';

export function AiMentorView() {
  const [settings, setSettings] = useState<SystemSettingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editState, setEditState] = useState<Record<number, SystemSettingUpdate>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  useEffect(() => {
    listSystemSettings()
      .then(data => {
        setSettings(data);
        if (data.length > 0) {
          setExpandedCard(data[0].settingId);
        }
        const initial: Record<number, SystemSettingUpdate> = {};
        data.forEach(s => {
          initial[s.settingId] = { name: s.name, model: s.model, prompt: s.prompt };
        });
        setEditState(initial);
      })
      .catch(err => {
        console.error('Failed to load settings:', err);
        setError('Nepodařilo se načíst nastavení.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (settingId: number, field: keyof SystemSettingUpdate, value: string) => {
    setEditState(prev => ({
      ...prev,
      [settingId]: { ...prev[settingId], [field]: value },
    }));
  };

  const isDirty = (setting: SystemSettingResponse) => {
    const edit = editState[setting.settingId];
    if (!edit) return false;
    return (
      edit.name !== setting.name ||
      edit.model !== setting.model ||
      edit.prompt !== setting.prompt
    );
  };

  const handleSave = async (setting: SystemSettingResponse) => {
    const edit = editState[setting.settingId];
    if (!edit) return;
    setSavingId(setting.settingId);
    try {
      const updated = await updateSystemSetting(setting.settingId, edit);
      setSettings(prev =>
        prev.map(s => (s.settingId === updated.settingId ? updated : s))
      );
      setEditState(prev => ({
        ...prev,
        [updated.settingId]: { name: updated.name, model: updated.model, prompt: updated.prompt },
      }));
    } catch (err) {
      console.error('Failed to save setting:', err);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <AiMentorSkeleton />;
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-full">
      <h1 className="text-2xl sm:text-3xl font-bold text-black mb-6">AI Mentor</h1>

      <div className="space-y-6">
        {settings.map(setting => {
          const edit = editState[setting.settingId];
          const dirty = isDirty(setting);
          const saving = savingId === setting.settingId;

          const isExpanded = expandedCard === setting.settingId;

          return (
            <div
              key={setting.settingId}
              className="bg-white rounded-xl border border-gray-200"
            >
              <button
                type="button"
                onClick={() => setExpandedCard(isExpanded ? null : setting.settingId)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors rounded-xl"
              >
                <h2 className="text-base font-bold text-black">
                  {setting.name} config
                </h2>
                <div className="flex items-center gap-3">
                  {dirty && (
                    <span className="text-xs text-purple-600 font-medium">Neuložené změny</span>
                  )}
                  {isExpanded ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="flex justify-end mt-4 mb-4">
                    {dirty && (
                      <button
                        onClick={() => handleSave(setting)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        {saving ? 'Ukládám...' : 'Uložit'}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-black mb-1.5">
                        Název
                      </label>
                      <input
                        type="text"
                        value={edit?.name ?? ''}
                        onChange={e => handleChange(setting.settingId, 'name', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-black mb-1.5">
                        AI model
                      </label>
                      <input
                        type="text"
                        value={edit?.model ?? ''}
                        onChange={e => handleChange(setting.settingId, 'model', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-black mb-1.5">
                      Prompt
                    </label>
                    <textarea
                      value={edit?.prompt ?? ''}
                      onChange={e => handleChange(setting.settingId, 'prompt', e.target.value)}
                      rows={6}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300 resize-y"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {settings.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">Žádná nastavení k zobrazení.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AiMentorView;
