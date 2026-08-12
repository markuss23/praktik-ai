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
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 lg:overflow-y-auto p-6 lg:p-8 bg-muted min-h-full">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">AI Mentor</h1>

      <div className="space-y-6">
        {settings.map(setting => {
          const edit = editState[setting.settingId];
          const dirty = isDirty(setting);
          const saving = savingId === setting.settingId;

          const isExpanded = expandedCard === setting.settingId;

          return (
            <div
              key={setting.settingId}
              className="bg-card rounded-xl border border-border"
            >
              <button
                type="button"
                onClick={() => setExpandedCard(isExpanded ? null : setting.settingId)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/50 transition-colors rounded-xl"
              >
                <h2 className="text-base font-bold text-foreground">
                  {setting.name} config
                </h2>
                <div className="flex items-center gap-3">
                  {dirty && (
                    <span className="text-xs text-gradient-r font-medium">Neuložené změny</span>
                  )}
                  {isExpanded ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-6 pb-6 border-t border-border">
                  <div className="flex justify-end mt-4 mb-4">
                    {dirty && (
                      <button
                        onClick={() => handleSave(setting)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-r text-primary-foreground rounded-lg text-sm font-medium hover:bg-gradient-r/80 transition-colors disabled:opacity-50"
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
                      <label className="block text-sm font-semibold text-foreground mb-1.5">
                        Název
                      </label>
                      <input
                        type="text"
                        value={edit?.name ?? ''}
                        onChange={e => handleChange(setting.settingId, 'name', e.target.value)}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gradient-r/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">
                        AI model
                      </label>
                      <input
                        type="text"
                        value={edit?.model ?? ''}
                        onChange={e => handleChange(setting.settingId, 'model', e.target.value)}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gradient-r/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Prompt
                    </label>
                    <textarea
                      value={edit?.prompt ?? ''}
                      onChange={e => handleChange(setting.settingId, 'prompt', e.target.value)}
                      rows={6}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gradient-r/30 resize-y"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {settings.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <p className="text-muted-foreground text-sm">Žádná nastavení k zobrazení.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AiMentorView;
