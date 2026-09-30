import React from 'react';
import { X, Table, Key, Link } from 'lucide-react';

export const SchemaPreview = ({ schema, onClose }) => {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Table size={20} style={{ color: 'var(--accent-color)' }} />
            <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--text-main)', fontWeight: 600 }}>Relational Schema Mapping</h2>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div style={{ padding: '30px', overflowY: 'auto', flex: 1, display: 'flex', flexWrap: 'wrap', gap: '24px', backgroundColor: 'var(--bg-color)', alignContent: 'flex-start' }}>
          {schema.length === 0 ? (
             <div className="empty-state-card" style={{ width: '100%', padding: '40px' }}>
                No tables generated. Add entities and relationships to your diagram first.
             </div>
          ) : (
             schema.map(table => (
               <div key={table.id} className="glass-panel" style={{ width: '100%', maxWidth: '320px', backgroundColor: '#fff', border: '1px solid var(--border-card)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                 <div style={{ padding: '12px 16px', backgroundColor: 'var(--accent-color)', color: '#fff', fontWeight: 600, fontSize: '14px', letterSpacing: '0.02em' }}>
                   {table.name}
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column' }}>
                   {table.columns.map((col, idx) => (
                     <div key={idx} style={{ padding: '10px 16px', borderBottom: idx === table.columns.length - 1 ? 'none' : '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', backgroundColor: (col.isPrimaryKey || col.isForeignKey) ? '#fafafa' : '#fff' }}>
                       <div style={{ width: '16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         {col.isPrimaryKey && <Key size={14} style={{ color: 'var(--key-gold)' }} title="Primary Key" />}
                         {!col.isPrimaryKey && col.isForeignKey && <Link size={14} style={{ color: '#0284c7' }} title="Foreign Key" />}
                       </div>
                       <span style={{ fontWeight: col.isPrimaryKey ? 600 : 400, flex: 1, color: 'var(--text-main)' }}>
                         {col.name}
                       </span>
                       <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                         {col.isPrimaryKey && col.isForeignKey ? 'PK, FK' : col.isPrimaryKey ? 'PK' : col.isForeignKey ? 'FK' : ''}
                       </span>
                     </div>
                   ))}
                   {table.columns.length === 0 && (
                       <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>No columns</div>
                   )}
                 </div>
               </div>
             ))
          )}
        </div>
      </div>
    </div>
  );
};
