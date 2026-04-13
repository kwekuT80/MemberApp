import { redirect } from 'next/navigation';
import { getCurrentProfile } from './getCurrentProfile';
export async function requireUser() { const result = await getCurrentProfile(); if (!result.user) redirect('/login'); return result; }
