'use client';
import React from 'react';

const labelStyle: React.CSSProperties = { fontSize:12, color:'#53657d', fontWeight:700 };
const inputStyle: React.CSSProperties = { padding:'11px 12px', borderRadius:10, border:'1px solid #cfd8e3', fontSize:14, background:'#fff', minHeight:44 };

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span style={labelStyle}>{children}</span>;
}

export function TextField({ label, value, onChange, type='text', placeholder }: { label:string; value:string; onChange:(value:string)=>void; type?:string; placeholder?:string }) {
  return <label style={{ display:'grid', gap:6 }}><FieldLabel>{label}</FieldLabel><input type={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)} style={inputStyle} /></label>;
}

export function TextAreaField({ label, value, onChange, placeholder }: { label:string; value:string; onChange:(value:string)=>void; placeholder?:string }) {
  return <label style={{ display:'grid', gap:6 }}><FieldLabel>{label}</FieldLabel><textarea value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)} style={{ ...inputStyle, minHeight:96, resize:'vertical' }} /></label>;
}

export function DateField({ label, value, onChange }: { label:string; value:string; onChange:(value:string)=>void }) {
  return <TextField label={label} value={value} onChange={onChange} type='date' />;
}

export function SelectField({ label, value, onChange, options, placeholder='Select an option' }: { label:string; value:string; onChange:(value:string)=>void; options:string[]; placeholder?:string }) {
  return <label style={{ display:'grid', gap:6 }}><FieldLabel>{label}</FieldLabel><select value={value} onChange={e=>onChange(e.target.value)} style={inputStyle}><option value=''>{placeholder}</option>{options.map(option => <option key={option} value={option}>{option}</option>)}</select></label>;
}

export function CheckboxField({ label, checked, onChange, hint }: { label:string; checked:boolean; onChange:(checked:boolean)=>void; hint?:string }) {
  return <label style={{ display:'grid', gap:6 }}><FieldLabel>{label}</FieldLabel><span style={{ display:'flex', gap:10, alignItems:'center', minHeight:44, padding:'10px 12px', borderRadius:10, border:'1px solid #cfd8e3', background:'#fff' }}><input type='checkbox' checked={checked} onChange={e=>onChange(e.target.checked)} />{hint ? <span style={{ color:'#53657d', fontSize:13 }}>{hint}</span> : null}</span></label>;
}

export { inputStyle, labelStyle };
