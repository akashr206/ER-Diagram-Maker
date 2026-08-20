import React, { useState } from 'react';
import { Plus, Link2, Trash2, MoreHorizontal, X } from 'lucide-react';

const NodeLabel = ({ label, isKey, isWeakKey, yOffset = 0, isEditing = false, editingLabel = "", onLabelChange, onFinishEdit }) => {
  const approxWidth = Math.max(20, (isEditing ? editingLabel : label).length * 7.5);

  if (isEditing) {
    return (
      <foreignObject x="-75" y={yOffset - 12} width="150" height="24" style={{ pointerEvents: 'all' }} className="no-export">
        <input
          autoFocus
          style={{
            width: '100%',
            height: '100%',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: isKey || isWeakKey ? '600' : '500',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--text-main)',
            textDecoration: isKey ? 'underline' : 'none'
          }}
          value={editingLabel}
          onChange={(e) => onLabelChange(e.target.value)}
          onBlur={onFinishEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onFinishEdit();
            e.stopPropagation();
          }}
          onPointerDown={(e) => e.stopPropagation()}
        />
      </foreignObject>
    );
  }

  return (
    <g style={{ pointerEvents: 'none', userSelect: 'none' }}>
      <text
        x="0"
        y={yOffset}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--text-main)"
        fontSize="14"
        fontWeight={isKey || isWeakKey ? "600" : "500"}
        textDecoration={isKey ? "underline" : "none"}
        style={{
          textDecoration: isKey ? 'underline' : 'none',
          textUnderlineOffset: '3px',
          cursor: 'text'
        }}
      >
        {label}
      </text>
      {isWeakKey && (
        <line
          x1={-approxWidth / 2}
          y1={yOffset + 9}
          x2={approxWidth / 2}
          y2={yOffset + 9}
          stroke="var(--text-main)"
          strokeWidth="1.5"
          strokeDasharray="4,3"
        />
      )}
    </g>
  );
};

const ActionHandle = ({ x, y, icon: Icon, color, onClick, title }) => (
  <g 
    transform={`translate(${x}, ${y})`} 
    onPointerDown={(e) => { e.stopPropagation(); onClick(e); }}
    style={{ cursor: 'pointer', pointerEvents: 'all' }}
    className="no-export"
  >
    <rect x="-13" y="-13" width="26" height="26" rx="6" ry="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }} />
    <svg x="-7" y="-7" width="14" height="14" style={{ pointerEvents: 'none' }}>
      <Icon size={14} color={color} strokeWidth={2.5} />
    </svg>
    <title>{title}</title>
  </g>
);

const ActionMenu = ({ x, y, onAddAttribute, onConnect, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <g transform={`translate(${x}, ${y})`} style={{ pointerEvents: 'all' }} className="no-export">
      {!isOpen ? (
        <g 
          onPointerDown={(e) => { e.stopPropagation(); setIsOpen(true); }}
          style={{ cursor: 'pointer' }}
        >
          <rect x="-13" y="-13" width="26" height="26" rx="6" ry="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }} />
          <svg x="-7" y="-7" width="14" height="14" style={{ pointerEvents: 'none' }}>
            <MoreHorizontal size={14} color="#64748b" strokeWidth={2.5} />
          </svg>
          <title>Options</title>
        </g>
      ) : (
        <g>
          <rect x="-13" y="-13" width="26" height="26" rx="6" ry="6" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" onPointerDown={(e) => { e.stopPropagation(); setIsOpen(false); }} style={{ cursor: 'pointer' }} />
          <svg x="-7" y="-7" width="14" height="14" style={{ pointerEvents: 'none' }}>
            <X size={14} color="#64748b" strokeWidth={3} />
          </svg>
          
          <ActionHandle x={30} y={0} icon={Plus} color="#64748b" title="Add Attribute" onClick={(e) => { setIsOpen(false); onAddAttribute(e); }} />
          <ActionHandle x={60} y={0} icon={Link2} color="#64748b" title="Connect Relationship" onClick={(e) => { setIsOpen(false); onConnect(e); }} />
          <ActionHandle x={90} y={0} icon={Trash2} color="#ef4444" title="Delete Entity" onClick={(e) => { setIsOpen(false); onDelete(e); }} />
        </g>
      )}
    </g>
  );
};

export const EntityNode = ({ node, isSelected, onPointerDown, onDoubleClick, isEditing, editingLabel, onLabelChange, onFinishEdit, onAddNode, onDeleteNode }) => {
  const width = 120;
  const height = 60;
  const isWeak = node.subtype === 'weak';
  
  return (
    <g 
      transform={`translate(${node.x + width/2}, ${node.y + height/2})`} 
      onPointerDown={(e) => onPointerDown(e, node.id)}
      onDoubleClick={(e) => onDoubleClick && onDoubleClick(e, node.id, node.label)}
      style={{ cursor: 'grab' }}
    >
      <rect
        x={-width/2}
        y={-height/2}
        width={width}
        height={height}
        fill="var(--node-fill)"
        stroke={isSelected ? "var(--accent-color)" : "var(--node-stroke)"}
        strokeWidth={isSelected ? 3 : 2}
        rx={4}
        ry={4}
        style={{ cursor: 'default' }}
      />
      {isWeak && (
        <rect
          x={-width/2 + 6}
          y={-height/2 + 6}
          width={width - 12}
          height={height - 12}
          fill="none"
          stroke={isSelected ? "var(--accent-color)" : "var(--node-stroke)"}
          strokeWidth={isSelected ? 2 : 1.5}
          rx={2}
          ry={2}
          style={{ cursor: 'default', pointerEvents: 'none' }}
        />
      )}
      <NodeLabel 
        label={node.label} 
        isKey={false} 
        isEditing={isEditing}
        editingLabel={editingLabel}
        onLabelChange={onLabelChange}
        onFinishEdit={onFinishEdit}
      />
      
      {isSelected && onAddNode && (
        <ActionMenu 
          x={width/2 + 10} y={-height/2}
          onAddAttribute={() => onAddNode('attribute', 'regular', 'New Attribute', node.id, null)}
          onConnect={() => onAddNode('relationship', 'regular', 'Relates', node.id, null)}
          onDelete={() => onDeleteNode(node.id)}
        />
      )}
    </g>
  );
};

export const AttributeNode = ({ node, isSelected, onPointerDown, onDoubleClick, isEditing, editingLabel, onLabelChange, onFinishEdit, onDeleteNode }) => {
  const rx = Math.max(45, node.label.length * 5 + 14);
  const ry = 26;
  const isDerived = node.subtype === 'derived';
  const isMultivalued = node.subtype === 'multivalued';
  const isKey = node.subtype === 'key';
  const isWeakKey = node.subtype === 'weak_key';
  
  return (
    <g 
      transform={`translate(${node.x + rx}, ${node.y + ry})`}
      onPointerDown={(e) => onPointerDown(e, node.id)}
      onDoubleClick={(e) => onDoubleClick && onDoubleClick(e, node.id, node.label)}
      style={{ cursor: 'grab' }}
    >
      <ellipse
        cx={0}
        cy={0}
        rx={rx}
        ry={ry}
        fill="var(--node-fill)"
        stroke={isSelected ? "var(--accent-color)" : "var(--node-stroke)"}
        strokeWidth={isSelected ? 3 : 2}
        strokeDasharray={isDerived ? "8,8" : "none"}
        style={{ cursor: 'default' }}
      />
      {isMultivalued && (
        <ellipse
          cx={0}
          cy={0}
          rx={rx - 6}
          ry={ry - 6}
          fill="none"
          stroke={isSelected ? "var(--accent-color)" : "var(--node-stroke)"}
          strokeWidth={isSelected ? 2 : 1.5}
          style={{ cursor: 'default', pointerEvents: 'none' }}
        />
      )}
      <NodeLabel 
        label={node.label} 
        isKey={isKey} 
        isWeakKey={isWeakKey}
        isEditing={isEditing}
        editingLabel={editingLabel}
        onLabelChange={onLabelChange}
        onFinishEdit={onFinishEdit}
      />
      {isSelected && onDeleteNode && (
        <ActionHandle 
          x={0} y={ry} 
          icon={Trash2} color="#ef4444" 
          title="Delete Attribute" 
          onClick={() => onDeleteNode(node.id)} 
        />
      )}
    </g>
  );
};

export const RelationshipNode = ({ node, isSelected, onPointerDown, onDoubleClick, isEditing, editingLabel, onLabelChange, onFinishEdit, onAddNode, onDeleteNode }) => {
  const width = 140;
  const height = 80;
  const isWeak = node.subtype === 'weak';
  
  const diamondPath = `M 0 ${-height/2} L ${width/2} 0 L 0 ${height/2} L ${-width/2} 0 Z`;
  const innerDiamondPath = `M 0 ${-height/2 + 8} L ${width/2 - 14} 0 L 0 ${height/2 - 8} L ${-width/2 + 14} 0 Z`;
  
  return (
    <g 
      transform={`translate(${node.x + width/2}, ${node.y + height/2})`}
      onPointerDown={(e) => onPointerDown(e, node.id)}
      onDoubleClick={(e) => onDoubleClick && onDoubleClick(e, node.id, node.label)}
      style={{ cursor: 'grab' }}
    >
      <path
        d={diamondPath}
        fill="var(--node-fill)"
        stroke={isSelected ? "var(--accent-color)" : "var(--node-stroke)"}
        strokeWidth={isSelected ? 3 : 2}
        strokeLinejoin="round"
        style={{ cursor: 'default' }}
      />
      {isWeak && (
        <path
          d={innerDiamondPath}
          fill="none"
          stroke={isSelected ? "var(--accent-color)" : "var(--node-stroke)"}
          strokeWidth={isSelected ? 2 : 1.5}
          strokeLinejoin="round"
          style={{ cursor: 'default', pointerEvents: 'none' }}
        />
      )}
      <NodeLabel 
        label={node.label} 
        isKey={false}
        isEditing={isEditing}
        editingLabel={editingLabel}
        onLabelChange={onLabelChange}
        onFinishEdit={onFinishEdit}
      />
      {isSelected && onDeleteNode && (
        <ActionHandle 
          x={0} y={height/2} 
          icon={Trash2} color="#ef4444" 
          title="Delete Relationship" 
          onClick={() => onDeleteNode(node.id)} 
        />
      )}
    </g>
  );
};
