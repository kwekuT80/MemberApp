/**
 * Vercel Cron Entry Point for Scheduled Automated Database Backup
 *
 * Triggered by Vercel cron schedule (weekly on Sunday at 00:00 UTC),
 * verifies auth token, extracts full database snapshot, uploads to secure
 * storage, and dispatches encrypted archive via email.
 */

import { NextResponse } from 'next/server';
import { sendBackupEmail } from '@/services/backupService';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Allow up to 2 minutes for full dump and compression

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('Authorization');

  // Verify cron secret token if configured
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized: Invalid cron authorization token' }, { status: 401 });
  }

  try {
    // 1. Determine target disaster recovery recipient
    let targetEmail = process.env.DISASTER_RECOVERY_EMAIL;

    if (!targetEmail) {
      // Find primary super_admin or registrar email
      try {
        const adminClient = await createAdminClient();
        const { data: superAdmins } = await adminClient
          .from('profiles')
          .select('id, role')
          .in('role', ['super_admin', 'registrar'])
          .limit(1);

        if (superAdmins && superAdmins.length > 0) {
          const { data: userData } = await adminClient.auth.admin.getUserById(superAdmins[0].id);
          if (userData?.user?.email) {
            targetEmail = userData.user.email;
          }
        }
      } catch (adminErr) {
        console.warn('[Cron Backup] Failed to query admin email from DB:', adminErr);
      }
    }

    if (!targetEmail) {
      targetEmail = process.env.RESEND_SENDER_EMAIL || 'admin@commandery500.org';
    }

    console.log(`[Cron Backup] Initiating weekly scheduled database backup to ${targetEmail}...`);

    // 2. Execute full vault generation and dispatch
    const result = await sendBackupEmail(targetEmail);

    if (!result.success) {
      console.error('[Cron Backup] Backup generation failed:', result.message);
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          timestamp: new Date().toISOString(),
          targetEmail,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Weekly disaster recovery backup successfully dispatched.',
      timestamp: new Date().toISOString(),
      recipient: targetEmail,
      totalRecords: result.totalRecords,
      uncompressedKb: result.uncompressedKb,
      compressedKb: result.compressedKb,
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error('[Cron Backup] Unexpected backup failure:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error during scheduled backup',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
