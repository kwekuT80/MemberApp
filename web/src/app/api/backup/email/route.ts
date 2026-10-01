import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendBackupEmail } from '@/services/backupService';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const allowedRoles = ['registrar', 'financial_registrar', 'welfare_treasurer', 'super_admin'];
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const recipientEmail = body.email || user.email;

    if (!recipientEmail || !recipientEmail.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const result = await sendBackupEmail(recipientEmail);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Backup Email API Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to dispatch backup email' },
      { status: 500 }
    );
  }
}
