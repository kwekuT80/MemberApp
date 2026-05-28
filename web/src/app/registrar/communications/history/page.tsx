import React from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { getAllCommunications } from '@/services/communicationService';

// Helper to get status badge color class
function getStatusBadge(status: string): string {
  switch (status) {
    case 'delivered':
      return 'badge-green';
    case 'failed':
      return 'badge-red';
    default:
      return 'badge-yellow';
  }
}

export default async function CommunicationHistoryPage({
  searchParams,
}: {
  searchParams?: Promise<
    Record<string, string | string[] | undefined>
  >;
}) {
  await requireRegistrar();

  const params = await searchParams;

  const type =
    params?.type === 'email' ||
    params?.type === 'sms'
      ? params.type
      : undefined;

  const status =
    typeof params?.status === 'string'
      ? params.status
      : undefined;

  const dateFrom =
    typeof params?.dateFrom === 'string'
      ? params.dateFrom
      : undefined;

  const dateTo =
    typeof params?.dateTo === 'string'
      ? params.dateTo
      : undefined;

  let communications: any[] = [];

  try {
    communications = await getAllCommunications({
      type,
      status,
      dateFrom,
      dateTo,
    });
  } catch (err) {
    // Table may not exist yet
  }

  return (
    <RegistrarShell
      title="Communication History"
      subtitle="View all sent messages and their delivery status"
    >
      {/* Filters */}
      <div className="card" style={{ marginBottom: 24 }}>
        <form
          action="/registrar/communications/history"
          method="get"
          className="flex flex-wrap gap-4 items-end"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">
              Type
            </label>

            <select
              name="type"
              defaultValue={type}
              className="p-2 border rounded-lg"
            >
              <option value="">All Types</option>
              <option value="email">Email Only</option>
              <option value="sms">SMS Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Status
            </label>

            <select
              name="status"
              defaultValue={status}
              className="p-2 border rounded-lg"
            >
              <option value="">All Statuses</option>
              <option value="delivered">Delivered</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              From Date
            </label>

            <input
              name="dateFrom"
              type="date"
              defaultValue={dateFrom}
              className="p-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              To Date
            </label>

            <input
              name="dateTo"
              type="date"
              defaultValue={dateTo}
              className="p-2 border rounded-lg"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
          >
            Apply Filters & Export
          </button>
        </form>
      </div>

      {/* Communication List */}
      <div className="card">
        <h3
          style={{
            margin: '0 0 16px',
            fontWeight: 800,
            fontSize: 16,
          }}
        >
          📨 Communications in Period (
          {communications.length})
        </h3>

        {communications.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>
            No communications found for this
            period.
          </p>
        ) : (
          <table className="member-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {communications.map((comm: any) => (
                <tr key={comm.id}>
                  <td>
                    {new Date(
                      comm.created_at
                    ).toLocaleDateString()}
                  </td>

                  <td>
                    {`${comm.members?.first_name || ''} ${
                      comm.members?.surname || ''
                    }`}
                  </td>

                  <td>
                    <span
                      className={`badge-${
                        comm.type === 'email'
                          ? 'blue'
                          : 'green'
                      }`}
                    >
                      {comm.type.toUpperCase()}
                    </span>
                  </td>

                  <td>
                    <span
                      className={getStatusBadge(
                        comm.status
                      )}
                    >
                      {comm.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </RegistrarShell>
  );
}