import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Canvas } from './components/Canvas';
import { FloatingPanel } from './components/FloatingPanel';
import { TopBar } from './components/TopBar';
import { getNonOverlappingPosition } from './utils/placement';
import { Analytics } from "@vercel/analytics/next";
import { 
  loadStoredDiagrams, 
  saveDiagrams, 
  saveActiveDiagramId, 
  createDefaultDiagram 
} from './utils/storage';

function App() {
  const [storedData] = useState(() => loadStoredDiagrams());
  const [diagrams, setDiagrams] = useState(storedData.diagrams);
  const [activeDiagramId, setActiveDiagramId] = useState(storedData.activeId);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [presentationMode, setPresentationMode] = useState(false);
  
  const [history, setHistory] = useState({ past: [], future: [] });

  const commitHistory = () => {
    setHistory(h => ({
      past: [...h.past.slice(-30), diagrams],
      future: []
    }));
  };

  const handleUndo = () => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    setHistory(h => ({
      past: h.past.slice(0, -1),
      future: [diagrams, ...h.future]
    }));
    setDiagrams(previous);
  };

  const handleRedo = () => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    setHistory(h => ({
      past: [...h.past, diagrams],
      future: h.future.slice(1)
    }));
    setDiagrams(next);
  };

  const activeDiagram = diagrams.find(d => d.id === activeDiagramId) || diagrams[0] || createDefaultDiagram();
  const nodes = activeDiagram.nodes || [];
  const edges = activeDiagram.edges || [];

  useEffect(() => {
    saveDiagrams(diagrams);
  }, [diagrams]);

  useEffect(() => {
    saveActiveDiagramId(activeDiagramId);
  }, [activeDiagramId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPresentationMode(false);
        setSelectedNodeId(null);
        setEditingNodeId(null);
        return;
      }

      const isInputFocused = document.activeElement && 
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
      
      if (isInputFocused) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId && !presentationMode) {
          handleDeleteNode(selectedNodeId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, presentationMode, history]);

  const updateActiveDiagram = (updater) => {
    setDiagrams(prev => prev.map(d => {
      if (d.id === activeDiagramId) {
        const updated = typeof updater === 'function' ? updater(d) : { ...d, ...updater };
        return { ...updated, updatedAt: Date.now() };
      }
      return d;
    }));
  };

  const handleCreateDiagram = (customName) => {
    commitHistory();
    const name = customName?.trim() || `Diagram ${diagrams.length + 1}`;
    const newDiagram = createDefaultDiagram(name);
    setDiagrams(prev => [...prev, newDiagram]);
    setActiveDiagramId(newDiagram.id);
    setSelectedNodeId(null);
  };

  const handleSelectDiagram = (diagramId) => {
    if (diagramId === activeDiagramId) return;
    setActiveDiagramId(diagramId);
    setSelectedNodeId(null);
    setHistory({ past: [], future: [] }); // clear history on switch
  };

  const handleRenameDiagram = (diagramId, newName) => {
    if (!newName?.trim()) return;
    commitHistory();
    setDiagrams(prev => prev.map(d => d.id === diagramId ? { ...d, name: newName.trim(), updatedAt: Date.now() } : d));
  };

  const handleDuplicateDiagram = (diagramId) => {
    const target = diagrams.find(d => d.id === diagramId);
    if (!target) return;
    commitHistory();
    const duplicated = {
      ...target,
      id: uuidv4(),
      name: `${target.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setDiagrams(prev => [...prev, duplicated]);
    setActiveDiagramId(duplicated.id);
    setSelectedNodeId(null);
  };

  const handleDeleteDiagram = (diagramId) => {
    commitHistory();
    const remaining = diagrams.filter(d => d.id !== diagramId);
    if (remaining.length === 0) {
      const fresh = createDefaultDiagram('Main Diagram');
      setDiagrams([fresh]);
      setActiveDiagramId(fresh.id);
    } else {
      setDiagrams(remaining);
      if (activeDiagramId === diagramId) {
        setActiveDiagramId(remaining[0].id);
      }
    }
    setSelectedNodeId(null);
  };

  const handleAddNode = (type, subtype, label, parentId, parentId2) => {
    commitHistory();
    let x, y;

    const viewport = activeDiagram.viewport || { x: 0, y: 0, zoom: 1 };
    const centerX = (window.innerWidth / 2 - viewport.x) / viewport.zoom;
    const centerY = (window.innerHeight / 2 - viewport.y) / viewport.zoom;

    if ((type === 'attribute' || type === 'relationship') && parentId) {
      const parent = nodes.find(n => n.id === parentId);
      if (parent) {
        const existingConnected = nodes.filter(n => (n.type === 'attribute' || n.type === 'relationship') && (n.parentId === parentId || n.parentId2 === parentId));
        const index = existingConnected.length;
        const angle = (index * (Math.PI / 3)) - (Math.PI / 2);
        const dist = type === 'relationship' ? 180 : 140;
        x = Math.round(parent.x + Math.cos(angle) * dist);
        y = Math.round(parent.y + Math.sin(angle) * dist);
      } else {
        const pos = getNonOverlappingPosition(nodes, centerX, centerY);
        x = pos.x;
        y = pos.y;
      }
    } else {
      const pos = getNonOverlappingPosition(nodes, centerX, centerY);
      x = pos.x;
      y = pos.y;
    }
    
    const newNode = {
      id: uuidv4(),
      type,
      subtype,
      label,
      x,
      y,
      parentId,
      parentId2,
      ...(type === 'relationship' ? { cardinality1: '1', cardinality2: 'N' } : {})
    };

    updateActiveDiagram(d => {
      const currentNodes = d.nodes || [];
      const currentEdges = d.edges || [];
      const newNodes = [...currentNodes, newNode];
      let newEdges = [...currentEdges];

      if (type === 'attribute' && parentId) {
        newEdges.push({ id: uuidv4(), source: newNode.id, target: parentId });
      } else if (type === 'relationship') {
        if (parentId) {
          newEdges.push({ id: uuidv4(), source: newNode.id, target: parentId });
        }
        if (parentId2) {
          newEdges.push({ id: uuidv4(), source: newNode.id, target: parentId2 });
        }
      }

      return { ...d, nodes: newNodes, edges: newEdges };
    });

    if (type === 'entity' || type === 'relationship') {
      setSelectedNodeId(newNode.id);
    }
  };

  const handleUpdateNodePosition = (nodeId, newX, newY) => {
    updateActiveDiagram(d => {
      const currentNodes = d.nodes || [];
      const node = currentNodes.find(n => n.id === nodeId);
      if (!node) return d;

      const dx = newX - node.x;
      const dy = newY - node.y;

      const updatedNodes = currentNodes.map(n => {
        if (n.id === nodeId) {
          return { ...n, x: newX, y: newY };
        }
        if (node.type === 'entity' && n.type === 'attribute' && n.parentId === nodeId) {
          return { ...n, x: n.x + dx, y: n.y + dy };
        }
        return n;
      });

      return { ...d, nodes: updatedNodes };
    });
  };

  const handleUpdateNode = (nodeId, updates) => {
    commitHistory();
    updateActiveDiagram(d => {
      const currentNodes = d.nodes || [];
      const currentEdges = d.edges || [];
      const updatedNodes = currentNodes.map(n => n.id === nodeId ? { ...n, ...updates } : n);
      let newEdges = currentEdges;

      if (updates.parentId !== undefined || updates.parentId2 !== undefined) {
        newEdges = currentEdges.filter(e => e.source !== nodeId);
        const updatedNode = { ...currentNodes.find(n => n.id === nodeId), ...updates };
        if (updatedNode.parentId) {
          newEdges.push({ id: uuidv4(), source: nodeId, target: updatedNode.parentId });
        }
        if (updatedNode.parentId2) {
          newEdges.push({ id: uuidv4(), source: nodeId, target: updatedNode.parentId2 });
        }
      }

      return { ...d, nodes: updatedNodes, edges: newEdges };
    });
  };

  const handleDeleteNode = (nodeId) => {
    commitHistory();
    updateActiveDiagram(d => {
      const currentNodes = d.nodes || [];
      const currentEdges = d.edges || [];
      const newNodes = currentNodes.filter(n => n.id !== nodeId && n.parentId !== nodeId);
      const newEdges = currentEdges.filter(e => e.source !== nodeId && e.target !== nodeId);
      return { ...d, nodes: newNodes, edges: newEdges };
    });
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
    if (editingNodeId === nodeId) {
      setEditingNodeId(null);
    }
  };

  const handleUpdateViewport = (newViewport) => {
    setDiagrams(prev => prev.map(d => 
      d.id === activeDiagramId ? { ...d, viewport: newViewport } : d
    ));
  };

  return (
    <>
      {!presentationMode && (
        <>
          <TopBar 
            diagrams={diagrams}
            activeDiagram={activeDiagram}
            onCreateDiagram={handleCreateDiagram}
            onSelectDiagram={handleSelectDiagram}
            onRenameDiagram={handleRenameDiagram}
            onDuplicateDiagram={handleDuplicateDiagram}
            onDeleteDiagram={handleDeleteDiagram}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={history.past.length > 0}
            canRedo={history.future.length > 0}
          />
          <FloatingPanel 
            nodes={nodes} 
            onAddNode={handleAddNode} 
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            selectedNodeId={selectedNodeId}
            setSelectedNodeId={setSelectedNodeId}
          />
        </>
      )}
      <Canvas 
        nodes={nodes}
        edges={edges}
        updateNodePosition={handleUpdateNodePosition}
        selectedNodeId={selectedNodeId}
        setSelectedNodeId={setSelectedNodeId}
        editingNodeId={editingNodeId}
        setEditingNodeId={setEditingNodeId}
        onUpdateNode={handleUpdateNode}
        onAddNode={handleAddNode}
        onDeleteNode={handleDeleteNode}
        onDragStart={commitHistory}
        diagramId={activeDiagram.id}
        diagramName={activeDiagram.name}
        viewport={activeDiagram.viewport || { x: 0, y: 0, zoom: 1 }}
        onViewportChange={handleUpdateViewport}
        presentationMode={presentationMode}
        setPresentationMode={setPresentationMode}
      />
    </>
  );
}

export default App;

