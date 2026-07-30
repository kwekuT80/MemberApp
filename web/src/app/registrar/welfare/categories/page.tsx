'use client';

import React, { useEffect, useState } from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { getWelfareCategories, createWelfareCategory } from '@/services/welfareService';
import { WelfareCategory } from '@/types/welfare';

export default function WelfareCategoriesPage() {
  const [categories, setCategories] = useState<WelfareCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultAmount, setDefaultAmount] = useState('500');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    try {
      const data = await getWelfareCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load welfare categories:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !defaultAmount) {
      alert('Please enter a benefit name and default payout amount');
      return;
    }

    setSubmitting(true);
    try {
      await createWelfareCategory({
        name,
        description,
        default_amount: parseFloat(defaultAmount),
      });

      alert('Welfare category created successfully!');
      setShowModal(false);
      setName('');
      setDescription('');
      setDefaultAmount('500');
      loadCategories();
    } catch (err: any) {
      console.error('Create category error:', err);
      alert(err.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RegistrarShell title="Welfare Benefit Categories" subtitle="Configure welfare benefit types, entitlement rules, and standard payout amounts">
      <div style={{ padding: '24px 0', fontFamily: 'Inter, sans-serif' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0F172A' }}>Active Benefit Types & Payout Rules</h2>
            <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>These categories dictate default amounts when logging welfare disbursements.</p>
          </div>

          <button 
            onClick={() => setShowModal(true)}
            style={{ background: '#3B82F6', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
          >
            ➕ Add New Category
          </button>
        </div>

        {/* Categories Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {loading ? (
            <div style={{ padding: 40, color: '#64748B' }}>Loading categories...</div>
          ) : categories.length === 0 ? (
            <div style={{ padding: 40, color: '#94A3B8' }}>No categories configured.</div>
          ) : (
            categories.map(cat => (
              <div key={cat.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>{cat.name}</h3>
                  <span style={{ background: '#ECFDF5', color: '#065F46', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 100 }}>
                    ACTIVE
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#64748B', margin: '12px 0 20px', minHeight: 38 }}>
                  {cat.description || 'No description provided.'}
                </p>

                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#64748B' }}>DEFAULT PAYOUT:</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#10B981', fontFamily: 'monospace' }}>
                    GH₵ {Number(cat.default_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Modal */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 480, width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Create Welfare Category</h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>BENEFIT CATEGORY NAME</label>
                  <input 
                    type="text"
                    placeholder="e.g. Childbirth Gift / Education Support"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1' }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>DEFAULT PAYOUT AMOUNT (GH₵)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={defaultAmount}
                    onChange={e => setDefaultAmount(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1' }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>DESCRIPTION / ENTITLEMENT CRITERIA</label>
                  <textarea 
                    rows={3}
                    placeholder="Describe eligibility criteria or guidelines..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justify: 'flex-end', gap: 12, marginTop: 24 }}>
                  <button type="button" onClick={() => setShowModal(false)} style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} style={{ background: '#3B82F6', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>
                    {submitting ? 'Creating...' : 'Create Category'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </RegistrarShell>
  );
}
