import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Tag, 
  Box, 
  ArrowRightLeft, 
  Key, 
  Layers, 
  X, 
  Database,
  Sparkles,
  Link2,
  KeyRound,
  GitCommit
} from 'lucide-react';
import { CustomSelect } from './CustomSelect';

export const FloatingPanel = ({ 
  nodes, 
  onAddNode, 
  onUpdateNode, 
  onDeleteNode, 
  selectedNodeId, 
  setSelectedNodeId 
}) => {
  const [quickEntity, setQuickEntity] = useState('');
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrType, setNewAttrType] = useState('regular');
  const [confirmDialog, setConfirmDialog] = useState(null);

  const handleSubtypeChange = (attrId, oldSubtype, newSubtype) => {
    if (oldSubtype === 'composite' && newSubtype !== 'composite') {
      const subAttrs = nodes.filter(n => n.type === 'attribute' && n.parentId === attrId);
      setConfirmDialog({
        title: "Change Attribute Type?",
        message: "Changing this attribute from Composite to another type will permanently delete all of its sub-attributes.",
        onConfirm: () => {
          subAttrs.forEach(sa => onDeleteNode(sa.id));
          onUpdateNode(attrId, { subtype: newSubtype });
          setConfirmDialog(null);
        },
        onCancel: () => setConfirmDialog(null)
      });
      return;
    }
    onUpdateNode(attrId, { subtype: newSubtype });
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const entities = nodes.filter(n => n.type === 'entity');

  const nodeAttributes = selectedNode && (selectedNode.type === 'entity' || selectedNode.type === 'relationship')
    ? nodes.filter(n => n.type === 'attribute' && n.parentId === selectedNode.id)
    : [];

  const areEntitiesConnected = (ent1Id, ent2Id, ignoreRelId) => {
    if (!ent1Id || !ent2Id) return false;
    const relNodes = nodes.filter(n => n.type === 'relationship' && n.id !== ignoreRelId);
    return relNodes.some(rel => {
      return (rel.parentId === ent1Id && rel.parentId2 === ent2Id) ||
             (rel.parentId === ent2Id && rel.parentId2 === ent1Id);
    });
  };

  const prevAttrCountRef = React.useRef(nodeAttributes.length);
  React.useEffect(() => {
    if (nodeAttributes.length > prevAttrCountRef.current) {
      const newAttr = nodeAttributes[nodeAttributes.length - 1];
      const input = document.getElementById(`attr-input-${newAttr.id}`);
      if (input) {
        input.focus();
        input.select();
      }
    }
    prevAttrCountRef.current = nodeAttributes.length;
  }, [nodeAttributes]);

  const handleAddQuickEntity = (e) => {
    e.preventDefault();
    if (!quickEntity.trim()) return;
    onAddNode('entity', 'regular', quickEntity.trim(), null, null);
    setQuickEntity('');
  };

  const handleAddAttributeToEntity = (e) => {
    if (e) e.preventDefault();
    if (!selectedNode || selectedNode.type !== 'entity') return;
    
    const attrName = newAttrName.trim() || `attr_${nodeAttributes.length + 1}`;
    onAddNode('attribute', newAttrType, attrName, selectedNode.id, null);
    setNewAttrName('');
    setNewAttrType('regular');
  };

  const handleAddKeyAttribute = () => {
    if (!selectedNode || selectedNode.type !== 'entity') return;
    const attrName = newAttrName.trim() || (selectedNode.label.toLowerCase() + '_id');
    onAddNode('attribute', 'key', attrName, selectedNode.id, null);
    setNewAttrName('');
  };

  const handleAddWeakKeyAttribute = () => {
    if (!selectedNode || selectedNode.type !== 'entity') return;
    const attrName = newAttrName.trim() || (selectedNode.label.toLowerCase() + '_part_id');
    onAddNode('attribute', 'weak_key', attrName, selectedNode.id, null);
    setNewAttrName('');
  };

  const handleSetCardinalityPreset = (c1, c2) => {
    if (!selectedNode || selectedNode.type !== 'relationship') return;
    onUpdateNode(selectedNode.id, { cardinality1: c1, cardinality2: c2 });
  };

  const renderAttributesSection = () => (
    <div className="panel-section">
      <div className="section-title-row">
        <div className="section-title">
          <Tag size={14} style={{ marginRight: '6px' }} />
          Attributes
        </div>
        <span className="badge">{nodeAttributes.length}</span>
      </div>

      <div className="attributes-manager-list" style={{ gap: '6px' }}>
        {nodeAttributes.map((attr) => {
          const subAttrs = nodes.filter(n => n.type === 'attribute' && n.parentId === attr.id);
          return (
          <div key={attr.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                id={`attr-input-${attr.id}`}
                className="input-field input-field-sm"
                style={{ flex: 1 }}
                value={attr.label}
                onChange={(e) => onUpdateNode(attr.id, { label: e.target.value })}
                placeholder="Name"
              />
              <div style={{ width: '130px', flexShrink: 0 }}>
                <CustomSelect
                  small
                  value={attr.subtype || 'regular'}
                  onChange={(val) => handleSubtypeChange(attr.id, attr.subtype, val)}
                  options={[
                    { value: 'key', label: 'Primary Key' },
                    { value: 'weak_key', label: 'Weak Key' },
                    { value: 'regular', label: 'Regular' },
                    { value: 'multivalued', label: 'Multi-valued' },
                    { value: 'derived', label: 'Derived' },
                    { value: 'composite', label: 'Composite' }
                  ]}
                />
              </div>
              <button 
                className="btn-icon-danger" 
                title="Delete Attribute"
                onClick={() => onDeleteNode(attr.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
            {attr.subtype === 'composite' && (
              <div style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid #e2e8f0', marginLeft: '6px', marginTop: '2px', marginBottom: '8px' }}>
                {subAttrs.map(subAttr => (
                  <div key={subAttr.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={13} style={{ color: '#94a3b8' }} />
                    <input
                      className="input-field input-field-sm"
                      style={{ flex: 1 }}
                      value={subAttr.label}
                      onChange={(e) => onUpdateNode(subAttr.id, { label: e.target.value })}
                      placeholder="Sub-attribute"
                    />
                    <button 
                      className="btn-icon-danger" 
                      style={{ padding: '4px' }}
                      onClick={() => onDeleteNode(subAttr.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button 
                  className="btn btn-secondary btn-sm" 
                  style={{ alignSelf: 'flex-start', padding: '4px 8px', fontSize: '11px', minHeight: '24px' }}
                  onClick={() => onAddNode('attribute', 'regular', 'Sub-Attr', attr.id, null)}
                >
                  <Plus size={12} /> Add Sub-Attribute
                </button>
              </div>
            )}
          </div>
        )})}
        <button 
          className="btn btn-secondary" 
          style={{ marginTop: '4px' }}
          onClick={() => onAddNode('attribute', 'regular', 'New Attribute', selectedNode.id, null)}
        >
          <Plus size={14} /> Add Attribute
        </button>
      </div>
    </div>
  );

  return (
    <aside className="sidebar no-export">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Database size={18} />
          </div>
          <div>
            <div className="title">Schema Elements</div>
            <div className="subtitle">Chen Notation Builder</div>
          </div>
        </div>
        {selectedNode && (
          <button 
            className="btn-icon" 
            title="Deselect"
            onClick={() => setSelectedNodeId(null)}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="sidebar-content">
        {!selectedNode ? (
          <>
            <div className="panel-section">
              <div className="section-title">Quick Add Entity</div>
              <form onSubmit={handleAddQuickEntity} className="quick-add-form">
                <input
                  className="input-field"
                  value={quickEntity}
                  onChange={(e) => setQuickEntity(e.target.value)}
                  placeholder="e.g. Student, Course, Order..."
                  autoFocus
                />
                <button type="submit" className="btn btn-primary" title="Add Entity">
                  <Plus size={16} /> Add
                </button>
              </form>
            </div>

            <div className="panel-section">
              <div className="section-title">Library Palette</div>
              <div className="palette-grid">
                <button 
                  className="palette-btn" 
                  onClick={() => onAddNode('entity', 'regular', 'Entity', null, null)}
                >
                  <Box size={16} />
                  <span>Entity</span>
                </button>
                <button 
                  className="palette-btn" 
                  onClick={() => onAddNode('entity', 'weak', 'Weak Entity', null, null)}
                >
                  <Layers size={16} />
                  <span>Weak Entity</span>
                </button>
                <button 
                  className="palette-btn" 
                  onClick={() => onAddNode('relationship', 'regular', 'Relationship', null, null)}
                >
                  <ArrowRightLeft size={16} />
                  <span>Relationship</span>
                </button>
                <button 
                  className="palette-btn" 
                  onClick={() => onAddNode('relationship', 'weak', 'Identifying Rel', null, null)}
                >
                  <Link2 size={16} />
                  <span>Weak Rel</span>
                </button>
              </div>
            </div>

            {entities.length > 0 && (
              <div className="panel-section">
                <div className="section-title-row">
                  <div className="section-title">Entities in Diagram</div>
                  <span className="badge">{entities.length}</span>
                </div>
                <div className="entity-list">
                  {entities.map(ent => {
                    const attrs = nodes.filter(n => n.type === 'attribute' && n.parentId === ent.id);
                    const keyAttrs = attrs.filter(n => n.subtype === 'key' || n.subtype === 'weak_key');
                    return (
                      <div 
                        key={ent.id} 
                        className="entity-list-item"
                        onClick={() => setSelectedNodeId(ent.id)}
                      >
                        <div className="entity-list-info">
                          <span className="entity-name">{ent.label}</span>
                          <span className="entity-meta">
                            {ent.subtype === 'weak' ? 'Weak Entity • ' : ''}
                            {attrs.length} {attrs.length === 1 ? 'attribute' : 'attributes'}
                            {keyAttrs.length > 0 && ` (${keyAttrs.length} keys)`}
                          </span>
                        </div>
                        <button className="btn-text">Edit</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="helper-box">
              <Sparkles size={16} className="helper-icon" />
              <span>
                Click on any Entity on the canvas to inspect, rename, and manage all its attributes and keys.
              </span>
            </div>
          </>
        ) : selectedNode.type === 'entity' ? (
          <>
            <div className="selection-badge-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="tag-badge">
                <Box size={13} /> {selectedNode.subtype === 'weak' ? 'Weak Entity' : 'Entity'}
              </span>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '4px 8px', fontSize: '12px', minWidth: 'auto', gap: '4px', borderRadius: '4px' }} 
                onClick={() => setSelectedNodeId(null)}
                title="Back to library"
              >
                Back
              </button>
            </div>

            <div className="panel-section">
              <div className="section-title">Entity Details</div>
              <div className="form-group">
                <label className="form-label">Entity Name</label>
                <input
                  className="input-field"
                  value={selectedNode.label}
                  onChange={(e) => onUpdateNode(selectedNode.id, { label: e.target.value })}
                  placeholder="Entity name"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Entity Type</label>
                <CustomSelect 
                  value={selectedNode.subtype || 'regular'} 
                  onChange={(val) => onUpdateNode(selectedNode.id, { subtype: val })}
                  options={[
                    { value: 'regular', label: 'Regular Entity (Single Rectangle)' },
                    { value: 'weak', label: 'Weak Entity (Double Rectangle)' }
                  ]}
                />
              </div>
            </div>

            {renderAttributesSection()}

            <div className="panel-section">
              <div className="section-title">Relationships</div>
              <button 
                className="btn btn-secondary" 
                onClick={() => onAddNode('relationship', 'regular', 'Relates', selectedNode.id, null)}
              >
                <ArrowRightLeft size={15} /> Connect to New Relationship
              </button>
            </div>

            <div className="panel-actions-footer">
              <button 
                className="btn btn-secondary btn-danger" 
                onClick={() => onDeleteNode(selectedNode.id)}
              >
                <Trash2 size={16} /> Delete Entity
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setSelectedNodeId(null)}
              >
                Done
              </button>
            </div>
          </>
        ) : selectedNode.type === 'relationship' ? (
          <>
            <div className="selection-badge-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="tag-badge">
                <ArrowRightLeft size={13} /> {selectedNode.subtype === 'weak' ? 'Identifying Relationship' : 'Relationship'}
              </span>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '4px 8px', fontSize: '12px', minWidth: 'auto', gap: '4px', borderRadius: '4px' }} 
                onClick={() => setSelectedNodeId(null)}
                title="Back to library"
              >
                Back
              </button>
            </div>

            <div className="panel-section">
              <div className="section-title">Relationship Details</div>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  className="input-field"
                  value={selectedNode.label}
                  onChange={(e) => onUpdateNode(selectedNode.id, { label: e.target.value })}
                  placeholder="e.g. Enrolls, Works_In..."
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Relationship Type</label>
                <select 
                  className="input-field select-field" 
                  value={selectedNode.subtype || 'regular'} 
                  onChange={(e) => onUpdateNode(selectedNode.id, { subtype: e.target.value })}
                >
                  <option value="regular">Regular Relationship (Diamond)</option>
                  <option value="weak">Identifying Relationship (Double Diamond)</option>
                </select>
              </div>
            </div>

            <div className="panel-section">
              <div className="section-title-row">
                <div className="section-title">
                  <GitCommit size={13} style={{ marginRight: '6px' }} />
                  Cardinality Ratio Presets
                </div>
              </div>
              <div className="cardinality-preset-grid">
                <button 
                  className={`preset-btn ${selectedNode.cardinality1 === '1' && selectedNode.cardinality2 === 'N' ? 'active-preset' : ''}`}
                  onClick={() => handleSetCardinalityPreset('1', 'N')}
                  title="One to Many (1:N)"
                >
                  <strong>1 : N</strong>
                  <span>One to Many</span>
                </button>
                <button 
                  className={`preset-btn ${selectedNode.cardinality1 === 'M' && selectedNode.cardinality2 === 'N' ? 'active-preset' : ''}`}
                  onClick={() => handleSetCardinalityPreset('M', 'N')}
                  title="Many to Many (M:N / N:N)"
                >
                  <strong>M : N</strong>
                  <span>Many to Many</span>
                </button>
                <button 
                  className={`preset-btn ${selectedNode.cardinality1 === '1' && selectedNode.cardinality2 === '1' ? 'active-preset' : ''}`}
                  onClick={() => handleSetCardinalityPreset('1', '1')}
                  title="One to One (1:1)"
                >
                  <strong>1 : 1</strong>
                  <span>One to One</span>
                </button>
                <button 
                  className={`preset-btn ${selectedNode.cardinality1 === 'N' && selectedNode.cardinality2 === '1' ? 'active-preset' : ''}`}
                  onClick={() => handleSetCardinalityPreset('N', '1')}
                  title="Many to One (N:1)"
                >
                  <strong>N : 1</strong>
                  <span>Many to One</span>
                </button>
              </div>
            </div>

            <div className="panel-section">
              <div className="section-title">Connected Entities & Roles</div>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <CustomSelect
                    small
                    value={selectedNode.parentId || ''} 
                    onChange={(val) => onUpdateNode(selectedNode.id, { parentId: val })}
                    options={[
                      { value: '', label: '-- Entity 1 --' },
                      ...entities
                        .filter(n => !areEntitiesConnected(n.id, selectedNode.parentId2, selectedNode.id))
                        .map(n => ({ value: n.id, label: n.label }))
                    ]}
                  />
                </div>
                <div style={{ width: '80px', flexShrink: 0 }}>
                  <CustomSelect
                    small
                    value={selectedNode.cardinality1 || '1'} 
                    onChange={(val) => onUpdateNode(selectedNode.id, { cardinality1: val })}
                    options={[
                      { value: '1', label: '1' },
                      { value: 'N', label: 'N' },
                      { value: 'M', label: 'M' }
                    ]}
                  />
                </div>
                <div style={{ width: '90px', flexShrink: 0 }}>
                  <CustomSelect
                    small
                    value={selectedNode.participation1 || 'partial'} 
                    onChange={(val) => onUpdateNode(selectedNode.id, { participation1: val })}
                    options={[
                      { value: 'partial', label: 'Partial' },
                      { value: 'total', label: 'Total' }
                    ]}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <CustomSelect
                    small
                    value={selectedNode.parentId2 || ''} 
                    onChange={(val) => onUpdateNode(selectedNode.id, { parentId2: val })}
                    options={[
                      { value: '', label: '-- Entity 2 --' },
                      ...entities
                        .filter(n => !areEntitiesConnected(selectedNode.parentId, n.id, selectedNode.id))
                        .map(n => ({ value: n.id, label: n.label }))
                    ]}
                  />
                </div>
                <div style={{ width: '80px', flexShrink: 0 }}>
                  <CustomSelect
                    small
                    value={selectedNode.cardinality2 || 'N'} 
                    onChange={(val) => onUpdateNode(selectedNode.id, { cardinality2: val })}
                    options={[
                      { value: 'N', label: 'N' },
                      { value: '1', label: '1' },
                      { value: 'M', label: 'M' }
                    ]}
                  />
                </div>
                <div style={{ width: '90px', flexShrink: 0 }}>
                  <CustomSelect
                    small
                    value={selectedNode.participation2 || 'partial'} 
                    onChange={(val) => onUpdateNode(selectedNode.id, { participation2: val })}
                    options={[
                      { value: 'partial', label: 'Partial' },
                      { value: 'total', label: 'Total' }
                    ]}
                  />
                </div>
              </div>
            </div>

            {renderAttributesSection()}

            <div className="panel-actions-footer">
              <button className="btn btn-secondary btn-danger" onClick={() => onDeleteNode(selectedNode.id)}>
                <Trash2 size={16} /> Delete Relationship
              </button>
              <button className="btn btn-secondary" onClick={() => setSelectedNodeId(null)}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="selection-badge-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="tag-badge">
                <Tag size={13} /> Attribute
              </span>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '4px 8px', fontSize: '12px', minWidth: 'auto', gap: '4px', borderRadius: '4px' }} 
                onClick={() => setSelectedNodeId(selectedNode.parentId)}
                title="Go to Parent"
              >
                Back to Parent
              </button>
            </div>

            <div className="panel-section">
              <div className="section-title">Attribute Name</div>
              <div className="form-group" style={{ marginTop: '12px' }}>
                <input
                  className="input-field"
                  value={selectedNode.label}
                  onChange={(e) => onUpdateNode(selectedNode.id, { label: e.target.value })}
                  placeholder="Attribute name"
                  autoFocus
                />
              </div>
            </div>

            <div className="panel-section">
              <div className="section-title-row">
                <div className="section-title">Sub-Attributes</div>
                <span className="badge">{nodes.filter(n => n.parentId === selectedNode.id).length}</span>
              </div>
              <div className="helper-box" style={{ marginTop: '12px', marginBottom: '12px' }}>
                Add sub-attributes to create a Composite Attribute (e.g. splitting "Name" into "First Name" and "Last Name").
              </div>
              <div className="attributes-manager-list" style={{ gap: '6px' }}>
                {nodes.filter(n => n.parentId === selectedNode.id).map((attr) => (
                  <div key={attr.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={13} style={{ color: '#94a3b8' }} />
                    <input
                      id={`attr-input-${attr.id}`}
                      className="input-field input-field-sm"
                      style={{ flex: 1 }}
                      value={attr.label}
                      onChange={(e) => onUpdateNode(attr.id, { label: e.target.value })}
                    />
                    <button 
                      className="btn-icon-danger" 
                      style={{ padding: '4px' }}
                      onClick={() => onDeleteNode(attr.id)}
                      title="Delete Sub-Attribute"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                
                <button 
                  className="btn btn-secondary btn-sm" 
                  style={{ marginTop: '6px' }}
                  onClick={() => onAddNode('attribute', 'regular', 'Sub-Attribute', selectedNode.id, null)}
                >
                  <Plus size={14} /> Add Sub-Attribute
                </button>
              </div>
            </div>
            
            <div className="panel-actions-footer">
              <button className="btn btn-secondary btn-danger" onClick={() => onDeleteNode(selectedNode.id)}>
                <Trash2 size={16} /> Delete Attribute
              </button>
              <button className="btn btn-secondary" onClick={() => setSelectedNodeId(null)}>
                Done
              </button>
            </div>
          </>
        )}
      </div>

      {confirmDialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '6px', width: '320px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>{confirmDialog.title}</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" style={{ borderRadius: '6px' }} onClick={confirmDialog.onCancel}>Cancel</button>
              <button className="btn btn-primary" style={{ backgroundColor: '#ef4444', borderColor: '#ef4444', color: '#fff', borderRadius: '6px' }} onClick={confirmDialog.onConfirm}>Change & Delete</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
