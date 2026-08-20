import React, { useRef, useState, useEffect } from 'react';
import { EntityNode, AttributeNode, RelationshipNode } from './Nodes';
import { downloadSVG, downloadPNG } from '../utils/export';
import { ZoomIn, ZoomOut, Maximize, Minimize, Focus, Plus, Trash2, Link2 } from 'lucide-react';

const getNodeCenter = (node) => {
  if (node.type === 'entity') {
    return { x: node.x + 60, y: node.y + 30 };
  } else if (node.type === 'relationship') {
    return { x: node.x + 70, y: node.y + 40 };
  } else if (node.type === 'attribute') {
    const rx = Math.max(45, node.label.length * 5 + 14);
    return { x: node.x + rx, y: node.y + 26 };
  }
  return { x: node.x, y: node.y };
};

export const Canvas = ({ 
  nodes, 
  edges, 
  updateNodePosition, 
  selectedNodeId, 
  setSelectedNodeId,
  editingNodeId,
  setEditingNodeId,
  onUpdateNode,
  onAddNode,
  onDeleteNode,
  onDragStart,
  diagramId,
  diagramName,
  viewport,
  onViewportChange,
  presentationMode,
  setPresentationMode
}) => {
  const svgRef = useRef(null);
  const canvasGroupRef = useRef(null);
  
  const [editingLabel, setEditingLabel] = useState("");

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  
  const [scale, setScale] = useState(viewport?.zoom || 1);
  const [pan, setPan] = useState({ x: viewport?.x || 0, y: viewport?.y || 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [draggedNodePos, setDraggedNodePos] = useState(null);

  const pointersRef = useRef(new Map());
  const pinchRef = useRef({ initialDist: 0, initialScale: 1, initialCenter: { x: 0, y: 0 }, initialPan: { x: 0, y: 0 } });

  useEffect(() => {
    setScale(viewport?.zoom || 1);
    setPan({ x: viewport?.x || 0, y: viewport?.y || 0 });
  }, [diagramId]);

  const clampPan = (p) => ({
    x: Math.max(-3000, Math.min(3000, p.x)),
    y: Math.max(-3000, Math.min(3000, p.y))
  });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (e) => {
      e.preventDefault();
      
      const zoomSensitivity = e.ctrlKey ? 0.025 : 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.min(Math.max(0.2, scale + delta), 4);
      
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const scaleRatio = newScale / scale;
      
      const newPanX = mouseX - (mouseX - pan.x) * scaleRatio;
      const newPanY = mouseY - (mouseY - pan.y) * scaleRatio;

      const newPan = clampPan({ x: newPanX, y: newPanY });

      setScale(newScale);
      setPan(newPan);
      
      if (onViewportChange) {
        clearTimeout(svg.wheelTimeout);
        svg.wheelTimeout = setTimeout(() => {
          onViewportChange({ x: newPan.x, y: newPan.y, zoom: newScale });
        }, 200);
      }
    };

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [scale, pan]);

  const handleNodeDoubleClick = (e, nodeId) => {
    e.stopPropagation();
    setEditingNodeId(nodeId);
  };

  useEffect(() => {
    if (editingNodeId) {
      const node = nodes.find(n => n.id === editingNodeId);
      if (node) {
        setEditingLabel(node.label);
      }
    } else {
      setEditingLabel("");
    }
  }, [editingNodeId]);

  const handleFinishEdit = () => {
    if (editingNodeId) {
      onUpdateNode(editingNodeId, { label: editingLabel });
      setEditingNodeId(null);
    }
  };

  const handleNodePointerDown = (e, nodeId) => {
    e.stopPropagation();
    if (e.target && e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      setIsDragging(false);
      setDraggedNodeId(null);
      setDraggedNodePos(null);
      
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchRef.current = {
        initialDist: dist,
        initialScale: scale,
        initialCenter: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
        initialPan: { ...pan }
      };
      setIsPanning(true);
      return;
    }

    if (presentationMode) return;

    if (onDragStart && !isDragging) {
      onDragStart();
    }
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.type === 'attribute') {
      if (node.parentId) {
        setSelectedNodeId(node.parentId);
      }
    } else {
      setSelectedNodeId(nodeId);
    }
    
    const svg = svgRef.current;
    const canvasGroup = canvasGroupRef.current;
    if (!svg || !canvasGroup) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(canvasGroup.getScreenCTM().inverse());

    setDragOffset({
      x: svgP.x - node.x,
      y: svgP.y - node.y
    });
    setDraggedNodeId(nodeId);
    setIsDragging(true);
  };

  const handleBgPointerDown = (e) => {
    if (e.target && e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchRef.current = {
        initialDist: dist,
        initialScale: scale,
        initialCenter: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
        initialPan: { ...pan }
      };
      setIsPanning(true);
    } else if (pointersRef.current.size === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handlePointerMove = (e) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const currentCenter = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      
      const pRef = pinchRef.current;
      if (pRef.initialDist > 0) {
        const scaleRatio = dist / pRef.initialDist;
        const newScale = Math.min(Math.max(0.2, pRef.initialScale * scaleRatio), 4);
        
        const newPanX = currentCenter.x - ((pRef.initialCenter.x - pRef.initialPan.x) / pRef.initialScale) * newScale;
        const newPanY = currentCenter.y - ((pRef.initialCenter.y - pRef.initialPan.y) / pRef.initialScale) * newScale;
        
        setScale(newScale);
        setPan(clampPan({ x: newPanX, y: newPanY }));
      }
      return;
    }

    if (isPanning && pointersRef.current.size <= 1) {
      const activePointer = Array.from(pointersRef.current.values())[0] || { x: e.clientX, y: e.clientY };
      setPan(clampPan({
        x: activePointer.x - panStart.x,
        y: activePointer.y - panStart.y
      }));
      return;
    }

    if (!isDragging || !draggedNodeId) return;

    const svg = svgRef.current;
    const canvasGroup = canvasGroupRef.current;
    if (!svg || !canvasGroup) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(canvasGroup.getScreenCTM().inverse());

    const newX = svgP.x - dragOffset.x;
    const newY = svgP.y - dragOffset.y;

    setDraggedNodePos({ x: newX, y: newY });
  };

  const handlePointerUp = (e) => {
    pointersRef.current.delete(e.pointerId);

    if (pointersRef.current.size === 1) {
       const remaining = Array.from(pointersRef.current.values())[0];
       setPanStart({ x: remaining.x - pan.x, y: remaining.y - pan.y });
       pinchRef.current.initialDist = 0;
       return; 
    }

    if (draggedNodeId && draggedNodePos) {
      updateNodePosition(draggedNodeId, draggedNodePos.x, draggedNodePos.y);
    }
    if (isPanning && onViewportChange) {
      onViewportChange({ x: pan.x, y: pan.y, zoom: scale });
    }
    setIsDragging(false);
    setDraggedNodeId(null);
    setDraggedNodePos(null);
    setIsPanning(false);
    pinchRef.current.initialDist = 0;
  };

  useEffect(() => {
    if (isDragging || isPanning) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    } else {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, isPanning, dragOffset, panStart, draggedNodeId, draggedNodePos, pan, scale, updateNodePosition, onViewportChange]);

  const resetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    if (onViewportChange) onViewportChange({ x: 0, y: 0, zoom: 1 });
  };

  const togglePresentationMode = () => {
    setPresentationMode(!presentationMode);
  };

  const handleZoom = (delta) => {
    setScale(prevScale => {
      let newScale = prevScale + delta;
      newScale = Math.max(0.2, Math.min(4, newScale));
      if (newScale === prevScale) return prevScale;
      
      setPan(prevPan => {
        const sidebarWidth = presentationMode ? 0 : 320;
        const screenX = (window.innerWidth - sidebarWidth) / 2;
        const screenY = window.innerHeight / 2;
        return {
          x: screenX - ((screenX - prevPan.x) / prevScale) * newScale,
          y: screenY - ((screenY - prevPan.y) / prevScale) * newScale
        };
      });
      
      return newScale;
    });
  };

  const getBoundingBox = () => {
    if (nodes.length === 0) return { x: 0, y: 0, width: 800, height: 600 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x;
      if (n.y > maxY) maxY = n.y;
    });
    
    const padding = 40;
    const nodeWidth = 250;
    const nodeHeight = 150;
    
    return {
      x: minX - padding,
      y: minY - padding,
      width: (maxX - minX) + nodeWidth + padding * 2,
      height: (maxY - minY) + nodeHeight + padding * 2
    };
  };


  const displayNodes = React.useMemo(() => {
    if (!draggedNodeId || !draggedNodePos) return nodes;
    
    const draggedOriginalNode = nodes.find(n => n.id === draggedNodeId);
    if (!draggedOriginalNode) return nodes;

    const dx = draggedNodePos.x - draggedOriginalNode.x;
    const dy = draggedNodePos.y - draggedOriginalNode.y;

    return nodes.map(n => {
      if (n.id === draggedNodeId) {
        return { ...n, x: draggedNodePos.x, y: draggedNodePos.y };
      }
      if (draggedOriginalNode.type === 'entity' && n.type === 'attribute' && n.parentId === draggedNodeId) {
        return { ...n, x: n.x + dx, y: n.y + dy };
      }
      return n;
    });
  }, [nodes, draggedNodeId, draggedNodePos]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', backgroundColor: 'var(--bg-color)' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onPointerDown={handleBgPointerDown}
        style={{ touchAction: 'none', cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <defs>
          <pattern id="grid" width={32 * scale} height={32 * scale} patternUnits="userSpaceOnUse" patternTransform={`translate(${pan.x % (32 * scale)}, ${pan.y % (32 * scale)})`}>
            <circle cx="2" cy="2" r="1.5" fill="#94a3b8" opacity="0.4" />
          </pattern>
        </defs>
        
        <rect width="100%" height="100%" fill="url(#grid)" className="no-export" />
        
        <g 
          ref={canvasGroupRef} 
          transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}
          style={{ transition: isPanning ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)' }}
        >
          {edges.map(edge => {
            const source = displayNodes.find(n => n.id === edge.source);
            const target = displayNodes.find(n => n.id === edge.target);
            if (!source || !target) return null;

            const p1 = getNodeCenter(source);
            const p2 = getNodeCenter(target);

            let cardinality = null;
            let relCenter = null;
            let entCenter = null;

            if (source.type === 'relationship' && target.type === 'entity') {
              relCenter = p1;
              entCenter = p2;
              if (target.id === source.parentId) {
                cardinality = source.cardinality1 !== undefined ? source.cardinality1 : '1';
              } else if (target.id === source.parentId2) {
                cardinality = source.cardinality2 !== undefined ? source.cardinality2 : 'N';
              }
            } else if (target.type === 'relationship' && source.type === 'entity') {
              relCenter = p2;
              entCenter = p1;
              if (source.id === target.parentId) {
                cardinality = target.cardinality1 !== undefined ? target.cardinality1 : '1';
              } else if (source.id === target.parentId2) {
                cardinality = target.cardinality2 !== undefined ? target.cardinality2 : 'N';
              }
            }

            let textX = 0;
            let textY = 0;
            if (cardinality && relCenter && entCenter) {
              const t = 0.5;
              const lx = relCenter.x + (entCenter.x - relCenter.x) * t;
              const ly = relCenter.y + (entCenter.y - relCenter.y) * t;

              const dx = entCenter.x - relCenter.x;
              const dy = entCenter.y - relCenter.y;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const nx = -dy / len;
              const ny = dx / len;
              const offset = 12;

              textX = lx + nx * offset;
              textY = ly + ny * offset;
            }

            return (
              <g key={edge.id}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="var(--node-stroke)"
                  strokeWidth="2"
                />
                {cardinality && (
                  <g transform={`translate(${textX}, ${textY})`} style={{ pointerEvents: 'none' }}>
                    <text
                      x="0"
                      y="1"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="var(--text-main)"
                      fontSize="14"
                      fontWeight="600"
                      stroke="var(--surface-color)"
                      strokeWidth="4"
                      paintOrder="stroke"
                    >
                      {cardinality}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {displayNodes.map(node => {
            const commonProps = {
              key: node.id,
              node: node,
              onPointerDown: handleNodePointerDown,
              onDoubleClick: presentationMode ? undefined : handleNodeDoubleClick,
              isEditing: presentationMode ? false : editingNodeId === node.id,
              editingLabel: editingLabel,
              onLabelChange: setEditingLabel,
              onFinishEdit: handleFinishEdit,
              onAddNode: presentationMode ? undefined : onAddNode,
              onDeleteNode: presentationMode ? undefined : onDeleteNode
            };

            const isSelected = presentationMode ? false : selectedNodeId === node.id;

            if (node.type === 'entity') {
              return <EntityNode {...commonProps} isSelected={isSelected} />;
            }
            if (node.type === 'attribute') {
              return <AttributeNode {...commonProps} isSelected={isSelected} />;
            }
            if (node.type === 'relationship') {
              return <RelationshipNode {...commonProps} isSelected={isSelected} />;
            }
            return null;
          })}
        </g>
      </svg>
      
      <div style={{ position: 'absolute', bottom: '24px', left: '24px', display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 5 }} className="no-export">
        <div className="zoom-controls-container glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '4px', width: 'fit-content' }}>
          <button className="btn btn-secondary" style={{ padding: '8px', border: 'none', background: 'transparent' }} onClick={() => handleZoom(0.2)} title="Zoom In">
            <ZoomIn size={18} />
          </button>
          <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
          <button className="btn btn-secondary" style={{ padding: '8px', border: 'none', background: 'transparent' }} onClick={() => handleZoom(-0.2)} title="Zoom Out">
            <ZoomOut size={18} />
          </button>
          <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
          <button className="btn btn-secondary" style={{ padding: '8px', border: 'none', background: 'transparent' }} onClick={resetView} title="Reset View">
            <Focus size={18} />
          </button>
          <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
          <button className="btn btn-secondary" style={{ padding: '8px', border: 'none', background: 'transparent' }} onClick={togglePresentationMode} title={presentationMode ? "Exit Presentation" : "Enter Presentation"}>
            {presentationMode ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>

        {!presentationMode && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary glass-panel" onClick={() => downloadSVG(svgRef.current, `${diagramName || 'er-diagram'}.svg`, getBoundingBox())}>
              Export SVG
            </button>
            <button className="btn btn-secondary glass-panel" onClick={() => downloadPNG(svgRef, `${diagramName || 'er-diagram'}.png`, getBoundingBox())}>
              Export PNG
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
