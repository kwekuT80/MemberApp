import React from 'react';
import Link from 'next/link';
import { getUpcomingBirthdayMembers } from '@/services/memberService';

export default async function BirthdaysWidget({ isRegistrar = false }: { isRegistrar?: boolean }) {
  const upcomingBirthdays = await getUpcomingBirthdayMembers();

  if (upcomingBirthdays.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: 32, borderLeft: '4px solid var(--gold)' }}>
      <h3 style={{ margin: '0 0 16px', color: 'var(--navy)', fontWeight: 800, fontSize: 16 }}>
        🎂 Upcoming Birthdays — Next 7 Days
      </h3>
      <div style={{ display: 'grid', gap: 12 }}>
        {upcomingBirthdays.map((member) => {
          const dob = new Date(member.date_of_birth!);
          const bMonth = dob.toLocaleString('en-US', { month: 'short' });
          const bDay = dob.getDate();

          // Calculate days until birthday
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          let birthdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
          birthdayThisYear.setHours(0, 0, 0, 0);

          if (birthdayThisYear < today) {
            birthdayThisYear = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
            birthdayThisYear.setHours(0, 0, 0, 0);
          }

          const diffMs = birthdayThisYear.getTime() - today.getTime();
          const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          const memberLink = isRegistrar 
            ? `/registrar/members/${member.id}`
            : `/me`; // Non-registrars don't have access to other members' detailed records, so just display the name or link to a safe place. Wait, they don't have a public directory yet? 

          return (
            <div key={member.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderRadius: 8,
              background: daysUntil === 0 ? '#fef3c7' : '#f9fafb',
              border: `1px solid ${daysUntil === 0 ? '#f59e0b' : '#e5e7eb'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>{daysUntil === 0 ? '🎉' : '📅'}</span>
                <div>
                  {isRegistrar ? (
                    <Link href={`/registrar/members/${member.id}`} style={{ fontWeight: 700, color: 'var(--navy)', textDecoration: 'none', fontSize: 14 }}>
                      {member.title || 'Bro.'} {member.first_name} {member.surname}
                    </Link>
                  ) : (
                    <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14 }}>
                      {member.title || 'Bro.'} {member.first_name} {member.surname}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge-blue" style={{ fontSize: 12, padding: '4px 10px' }}>{bMonth} {bDay}</span>
                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                  {daysUntil === 0 ? 'Today!' : `in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
