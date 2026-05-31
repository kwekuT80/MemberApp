'use client';

import { useState, useEffect } from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { getReminderConfig, saveReminderConfig } from '@/services/financialService';

export default function NotificationSettingsPage() {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getReminderConfig().then((data) => {
      setConfig(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const updates: Record<string, any> = {};

      for (const [key, value] of formData.entries()) {
        if (value === 'on') {
          updates[key] = true;
        } else if (typeof value === 'string' && !isNaN(Number(value))) {
          updates[key] = Number(value);
        } else {
          updates[key] = value;
        }
      }

      await saveReminderConfig(updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <RegistrarShell title="Notification Settings" subtitle="Loading..."><p>Loading...</p></RegistrarShell>;

  return (
    <RegistrarShell title="Notification Settings" subtitle="Configure automated payment reminders">
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {saved && (
          <div style={{ background: '#d1fae5', color: '#065f46', padding: 12, borderRadius: 8, marginBottom: 20 }}>
            Settings saved successfully.
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'grid', gap: 24 }}>

          {/* General Section */}
          <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <legend style={{ fontWeight: 700, color: '#1f2937' }}>General</legend>

            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
              Enable Reminders
              <input name="enabled" type="checkbox" defaultChecked={!!config.enabled} style={{ marginLeft: 8 }} />
            </label>

            <label style={{ display: 'block', marginTop: 12, marginBottom: 4, fontWeight: 500 }}>
              Reminder Channel (Default)
              <select name="_channel_default" defaultValue={config._channel_default || 'email'} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db', marginTop: 4 }}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </label>
          </fieldset>

          {/* Timing Section */}
          <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <legend style={{ fontWeight: 700, color: '#1f2937' }}>Timing</legend>

            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
              Days Before Due (for upcoming reminders)
              <input name="days_before_due" type="number" defaultValue={config.days_before_due || 7} min={1} max={30} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db', marginTop: 4 }} />
            </label>

            <label style={{ display: 'block', marginTop: 12, marginBottom: 4, fontWeight: 500 }}>
              Send Overdue 90-Day Reminders
              <input name="overdue_threshold_90" type="checkbox" defaultChecked={!!config.overdue_threshold_90} style={{ marginLeft: 8 }} />
            </label>

            <label style={{ display: 'block', marginTop: 12, marginBottom: 4, fontWeight: 500 }}>
              Send Overdue 180-Day Reminders (Critical)
              <input name="overdue_threshold_180" type="checkbox" defaultChecked={!!config.overdue_threshold_180} style={{ marginLeft: 8 }} />
            </label>
          </fieldset>

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            style={{
              background: saving ? '#9ca3af' : '#4f46e5',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 8,
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              width: '100%',
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

        </form>
      </div>
    </RegistrarShell>
  );
}
