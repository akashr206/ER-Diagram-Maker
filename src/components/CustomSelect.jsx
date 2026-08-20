import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export const CustomSelect = ({ value, onChange, options, className = "", small = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`custom-select-container ${className}`} ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        className={`input-field ${small ? 'input-field-sm' : ''} ${isOpen ? 'ring-focus' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          cursor: 'pointer', 
          userSelect: 'none',
          gap: '8px'
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedOption ? selectedOption.label : 'Select...'}
        </span>
        <ChevronDown size={small ? 14 : 16} style={{ opacity: 0.5, flexShrink: 0 }} />
      </div>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          zIndex: 50,
          maxHeight: '220px',
          overflowY: 'auto',
          padding: '4px'
        }}>
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                padding: small ? '6px 8px' : '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: small ? '12px' : '13px',
                backgroundColor: value === opt.value ? '#f1f5f9' : 'transparent',
                color: 'var(--text-main)',
                transition: 'background-color 0.1s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = value === opt.value ? '#f1f5f9' : 'transparent'}
            >
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {opt.label}
              </span>
              {value === opt.value && <Check size={14} style={{ flexShrink: 0, marginLeft: '8px' }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
