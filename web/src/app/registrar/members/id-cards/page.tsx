return (
  <RegistrarShell
    title="Bulk Member ID Cards Generator"
    subtitle="Batch print formatted membership cards (6 cards per A4 page) for fast event check-in"
  >
    <div style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* CSS for Screen vs Print Layout (6 cards per A4 page: 2 columns x 3 rows) */}
      <style jsx global>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              background: white !important;
              color: black !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print, nav, header, sidebar, .registrar-shell-header {
              display: none !important;
            }
            .print-container {
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
            }
            .cards-grid {
              display: grid !important;
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 8mm 6mm !important;
              width: 100% !important;
            }
            .id-card-item {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              box-shadow: none !important;
              border: 2px solid #C9A84C !important;
              height: 82mm !important; /* Fixed height so exactly 6 fit on A4 */
              box-sizing: border-box !important;
            }
          }
        `}</style>

      {/* Screen Controls & Filtering Header */}
      <div className="no-print" style={{
        background: 'white',
        borderRadius: 16,
        padding: 24,
        border: '1px solid #E2E8F0',
        marginBottom: 28,
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
            Batch Print Member ID Cards
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
            Showing {filteredMembers.length} member card(s). Prepared in 2x3 layout (6 cards per A4 sheet).
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search member name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              fontSize: 13,
              minWidth: 200
            }}
          />

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              fontSize: 13,
              background: 'white',
              fontWeight: 700
            }}
          >
            <option value="Active">Filter: Active Members</option>
            <option value="ALL">Filter: All Statuses</option>
            <option value="Deceased">Filter: Deceased (Archival Roll)</option>
            <option value="Dismissed">Filter: Dismissed</option>
            <option value="Transfer-Out">Filter: Transfer-Out</option>
          </select>

          <button
            onClick={() => window.print()}
            disabled={filteredMembers.length === 0}
            style={{
              background: filteredMembers.length > 0 ? 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' : '#94A3B8',
              color: 'white',
              border: 'none',
              padding: '10px 24px',
              borderRadius: 8,
              fontWeight: 800,
              cursor: filteredMembers.length > 0 ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(15,23,42,0.15)'
            }}
          >
            <span>🖨️</span>
            <span>Print All ({filteredMembers.length}) Cards</span>
          </button>
        </div>
      </div>

      {/* Printing / Cards Layout */}
      <div className="print-container">
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748B' }}>Loading members for batch printing...</div>
        ) : filteredMembers.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8', background: 'white', borderRadius: 16, border: '2px dashed #E2E8F0' }}>
            No member records found matching the current search/filter.
          </div>
        ) : (
          <div
            className="cards-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 24
            }}
          >
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="id-card-item"
                style={{
                  background: '#132135',
                  borderRadius: 16,
                  padding: 16,
                  border: '2.5px solid #C9A84C',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
                }}
              >
                {/* Card Top Header */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ color: '#C9A84C', fontWeight: 900, letterSpacing: 0.8, fontSize: 11 }}>
                        K.S.J.I REGISTRAR SUITE
                      </div>
                      <div style={{ color: '#8892B0', fontSize: 8, fontWeight: 700 }}>
                        Official Membership ID
                      </div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '50%', padding: 2, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src="/logo.png" alt="Logo" style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
                    </div>
                  </div>

                  {/* Member Photo + Info Main Block */}
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
                    <div style={{
                      width: 75,
                      height: 90,
                      background: '#1E293B',
                      borderRadius: 8,
                      border: '2px solid #C9A84C',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {member.photo_url ? (
                        <img src={member.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ color: '#64748B', fontWeight: 800, fontSize: 9 }}>NO PHOTO</span>
                      )}
                    </div>

                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ color: '#C9A84C', fontWeight: 800, fontSize: 11 }}>{member.title || 'Bro.'}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {member.surname}
                      </div>
                      <div style={{ color: '#CCD6F6', fontSize: 13, fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {member.first_name} {member.other_names || ''}
                      </div>
                      <div style={{
                        marginTop: 6,
                        display: 'inline-block',
                        background: member.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: member.status === 'Active' ? '#34D399' : '#FCA5A5',
                        padding: '2px 8px',
                        borderRadius: 100,
                        fontSize: 9,
                        fontWeight: 900,
                        border: `1px solid ${member.status === 'Active' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(252, 165, 165, 0.3)'}`
                      }}>
                        STATUS: {member.status?.toUpperCase() || 'ACTIVE'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Bottom Footer with QR */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  borderTop: '1px solid rgba(255,255,255,0.12)',
                  paddingTop: 8,
                  gap: 12
                }}>
                  <div style={{ background: 'white', padding: 4, borderRadius: 6, width: 52, height: 52, flexShrink: 0 }}>
                    <img
                      src={`https://quickchart.io/qr?text=${encodeURIComponent('https://ksji-members.vercel.app/verify/' + member.id)}&size=120&margin=1`}
                      alt="QR Code"
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#8892B0', fontSize: 8, fontWeight: 800 }}>ID NUMBER</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#FCD34D' }}>
                      KSJI-{member.id?.slice(0, 8).toUpperCase()}
                    </div>

                    <div style={{ color: '#8892B0', fontSize: 8, fontWeight: 800, marginTop: 4 }}>JOINED / COMMANDERY</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#CCD6F6' }}>
                      {member.date_joined || '---'} • #500
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  </RegistrarShell>
);