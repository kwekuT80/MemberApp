import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateFullDatabaseBackup } from '@/services/backupService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check registrar or admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const allowedRoles = ['registrar', 'financial_registrar', 'welfare_treasurer', 'super_admin'];
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const vault = await generateFullDatabaseBackup();
    const jsonString = JSON.stringify(vault, null, 2);

    const dateSlug = new Date().toISOString().slice(0, 10);
    const filename = `ksji-commandery-500-vault-${dateSlug}.json`;

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('[Backup Download API Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate database vault' },
      { status: 500 }
    );
  }
}
