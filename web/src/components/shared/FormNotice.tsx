import React from 'react';

export default function FormNotice({
  errors,
  message,
  helper,
}: {
  errors?: string[];
  message?: string | null;
  helper?: string | null;
}) {
  const hasErrors = Boolean(errors && errors.length);
  const hasMessage = Boolean(message);
  const hasHelper = Boolean(helper);

  if (!hasErrors && !hasMessage && !hasHelper) return null;

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {hasHelper ? (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: '#f4f7fb', color: '#38506a', border: '1px solid #d9e4f0' }}>
          {helper}
        </div>
      ) : null}
      {hasErrors ? (
        <div style={{ padding: '12px 14px', borderRadius: 12, background: '#fff4f4', color: '#8a1f1f', border: '1px solid #f0c9c9' }}>
          <strong>Please fix the following before saving:</strong>
          <ul style={{ margin: '8px 0 0 18px', padding: 0 }}>
            {errors!.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      ) : null}
      {hasMessage ? (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: '#f3fbf5', color: '#1f6f43', border: '1px solid #cfe9d6' }}>
          {message}
        </div>
      ) : null}
    </div>
  );
}
