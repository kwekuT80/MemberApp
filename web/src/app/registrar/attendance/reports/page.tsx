import { redirect } from 'next/navigation';

export default function AttendanceReportsRedirectPage() {
  redirect('/registrar/meetings/metrics');
}
