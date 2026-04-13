import { redirect } from 'next/navigation';
import { getCurrentProfile } from './getCurrentProfile';
export async function requireRegistrar() { const result = await getCurrentProfile(); if (!result.user) redirect('/login'); if (result.profile?.role !== 'registrar') redirect('/me'); return result; }
