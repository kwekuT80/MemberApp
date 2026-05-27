'use client';

import React, { useState } from 'react';
import { CommunicationType, TemplateId } from '@/services/communicationService';

// Available templates for selection
const TEMPLATES: { id: TemplateId; label: string; type: CommunicationType; description: string }[] = [
  { id: 'payment_reminder', label: 'Payment Reminder', type: 'email', description: 'Notify member of upcoming payment due' },
  { id: 'meeting_notice', label: 'Meeting Notice', type: 'email', description: 'Inform member about upcoming meeting' },
  { id: 'general', label: 'General Message', type: 'email', description: 'Custom message with free-form content' },
];

interface MemberOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface CommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMemberId?: string;
  members?: MemberOption[]; // Optional preloaded member list
  onSuccess?: (result: any) => void;
}

export default function CommunicationModal({ isOpen, onClose, initialMemberId, members, onSuccess }: CommunicationModalProps) {
  const [type, setType] = useState<CommunicationType>('email');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(initialMemberId ? [initialMemberId] : []);
  const [templateId, setTemplateId] = useState<TemplateId | ''>('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null);

  // Reset when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setResult(null);
      setTemplateId(initialMemberId ? '' : '');
    }
  }, [isOpen, initialMemberId]);

  const selectedMembersList = members?.filter(m => selectedMembers.includes(m.id)) || [];

  // Handle template selection — auto-fills content based on template type
  const handleTemplateChange = (template: typeof TEMPLATES[0]) => {
    setTemplateId(template.id);
    setType(template.type);

    if (template.id === 'payment_reminder') {
      setSubject('Payment Reminder - Upcoming Due');
      setContent('Dear Member,\n\nThis is a reminder that your payment is due soon. Please contact the registrar to make arrangements.\n\nKind regards, KSJI Commandery');
    } else if (template.id === 'meeting_notice') {
      setSubject('Meeting Notice - Upcoming Meeting');
      setContent('Dear Member,\n\nYou are invited to attend our upcoming meeting. Please confirm your attendance.\n\nKind regards, KSJI Commandery');
    } else {
      setSubject('Message from KSJI');
      setContent('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMembers.length) return;

    setSending(true);
    setResult(null);

    try {
      // Build request payload
      const isBulk = selectedMembers.length > 1;
      const payload: any = {
        memberIds: selectedMembers,
        type,
        templateId: templateId || undefined,
        subject: subject || undefined,
        htmlContent: content ? `<div>${content.replace(/\n/g, '<br/>')}</div>` : undefined,
        textContent: content || undefined,
      };

      const response = await fetch('/api/communications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send');
      }

      setResult({ success: true, message: isBulk ? `${data.sent} sent successfully` : 'Message sent' });
      onSuccess?.(data);

      // Close modal on single send
      if (!isBulk) {
        setTimeout(onClose, 1500);
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Failed to send communication' });
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">

        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Send Communication</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={sending}>✕</button>
        </div>

        {/* Success/Error Result */}
        {result && (
          <div className={`mx-6 mt-4 p-3 rounded-lg ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {result.message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Member Selection */}
          <div>
            <label className="block text-sm font-semibold mb-2">Members</label>
            {members ? (
              <div className="space-y-1 max-h-32 overflow-y-auto border rounded-lg p-2">
                {members.map(m => (
                  <label key={m.id} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 px-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(m.id)}
                      onChange={(e) => {
                        if (e.target.checked && !selectedMembers.includes(m.id)) {
                          setSelectedMembers([...selectedMembers, m.id]);
                        } else {
                          setSelectedMembers(selectedMembers.filter(id => id !== m.id));
                        }
                      }}
                    />
                    <span className="text-sm">{m.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No members loaded — use member detail page for single send.</p>
            )}
          </div>

          {/* Communication Type */}
          <div>
            <label className="block text-sm font-semibold mb-2">Type</label>
            <div className="flex space-x-4">
              {(['email', 'sms'] as CommunicationType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${type === t ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:border-blue-400'}`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-semibold mb-2">Template (optional)</label>
            <select
              value={templateId}
              onChange={(e) => {
                const t = TEMPLATES.find(tpl => tpl.id === e.target.value);
                if (t) handleTemplateChange(t);
                setTemplateId(e.target.value);
              }}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">None — use custom content</option>
              {TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          {(type === 'email') && (
            <div>
              <label htmlFor="subject" className="block text-sm font-semibold mb-2">Subject</label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line"
                className="w-full p-2 border rounded-lg"
              />
            </div>
          )}

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-semibold mb-2">Message</label>
            <textarea
              id="content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your message here..."
              className="w-full p-3 border rounded-lg font-mono text-sm"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} disabled={sending} className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedMembers.length || sending}
              className={`px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg transition-colors ${!selectedMembers.length || sending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
            >
              {sending ? 'Sending...' : selectedMembers.length > 1 ? `Send to ${selectedMembers.length} Members` : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
