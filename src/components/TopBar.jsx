import React, { useState } from 'react';
import { 
  Database, 
  Plus, 
  Trash2, 
  Copy, 
  Pencil, 
  Check, 
  FolderKanban,
  CheckCircle2,
  Undo,
  Redo
} from 'lucide-react';
import { CustomSelect } from './CustomSelect';

export const TopBar = ({
  diagrams = [],
  activeDiagram,
  onCreateDiagram,
  onSelectDiagram,
  onRenameDiagram,
  onDuplicateDiagram,
  onDeleteDiagram,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleStartRename = () => {
    setTempName(activeDiagram?.name || 'Main Diagram');
    setIsEditingName(true);
  };

  const handleSaveRename = (e) => {
    if (e) e.preventDefault();
    if (tempName.trim() && activeDiagram) {
      onRenameDiagram(activeDiagram.id, tempName.trim());
    }
    setIsEditingName(false);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    onCreateDiagram(newTitle.trim() || `Diagram ${diagrams.length + 1}`);
    setNewTitle('');
    setShowNewModal(false);
  };

  return (
    <header className="canvas-topbar glass-panel no-export">
      <div className="topbar-brand">
        <div className="brand-badge">
          <Database size={16} />
        </div>
        <span className="brand-title">Chen ER</span>
      </div>

      <div className="topbar-divider" />

      <div className="topbar-diagram-info">
        <FolderKanban size={15} className="folder-icon" />
        {isEditingName ? (
          <form onSubmit={handleSaveRename} className="topbar-rename-form">
            <input
              className="input-field input-field-sm topbar-rename-input"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              autoFocus
              onBlur={handleSaveRename}
            />
            <button type="submit" className="btn-icon-check" title="Save name">
              <Check size={13} />
            </button>
          </form>
        ) : (
          <div className="topbar-name-display" onClick={handleStartRename} title="Click to rename diagram">
            <span className="active-diagram-title">{activeDiagram?.name || 'Main Diagram'}</span>
            <Pencil size={12} className="edit-pencil-icon" />
          </div>
        )}
      </div>

      <div className="topbar-select-wrap" style={{ width: '180px' }}>
        <CustomSelect
          small
          value={activeDiagram?.id || ''}
          onChange={(val) => onSelectDiagram(val)}
          options={diagrams.map(diag => ({ value: diag.id, label: diag.name }))}
        />
      </div>

      <div className="topbar-actions">
        <button 
          className="btn-icon" 
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
          style={{ opacity: canUndo ? 1 : 0.5, cursor: canUndo ? 'pointer' : 'not-allowed' }}
        >
          <Undo size={14} />
        </button>
        <button 
          className="btn-icon" 
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
          style={{ opacity: canRedo ? 1 : 0.5, cursor: canRedo ? 'pointer' : 'not-allowed' }}
        >
          <Redo size={14} />
        </button>

        <div className="topbar-divider" style={{ height: '14px', margin: '0 4px' }} />

        <button 
          className="btn-icon"
          onClick={() => setShowNewModal(prev => !prev)}
          title="Create New Diagram"
        >
          <Plus size={16} />
        </button>

        <button 
          className="btn-icon" 
          onClick={() => onDuplicateDiagram(activeDiagram?.id)}
          title="Duplicate Current Diagram"
        >
          <Copy size={14} />
        </button>

        {diagrams.length > 1 && (
          <button 
            className="btn-icon-danger" 
            onClick={() => {
              if (window.confirm(`Delete diagram "${activeDiagram?.name}"?`)) {
                onDeleteDiagram(activeDiagram?.id);
              }
            }}
            title="Delete Current Diagram"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>



      {showNewModal && (
        <form onSubmit={handleCreateSubmit} className="topbar-new-popover glass-panel">
          <div className="popover-title">Create New ER Diagram</div>
          <input
            className="input-field input-field-sm"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. E-Commerce System, School DB..."
            autoFocus
          />
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={() => setShowNewModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Create Diagram
            </button>
          </div>
        </form>
      )}
    </header>
  );
};
