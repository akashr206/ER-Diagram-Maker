import React, { useRef, useState, useEffect } from 'react';
import { EntityNode, AttributeNode, RelationshipNode } from './Nodes';
import { downloadSVG, downloadPNG } from '../utils/export';
import { ZoomIn, ZoomOut, Maximize, Minimize, Focus, Plus, Trash2, Link2 } from 'lucide-react';

const getNodeCenter = (node) => {
  if (node.type === 'entity') {
    const width = Math.max(120, (node.label || '').length * 8 + 40);
    return { x: node.x + width / 2, y: node.y + 30 };
  } else if (node.type === 'relationship') {
    const width = Math.max(140, (node.label || '').length * 9 + 40);
    return { x: node.x + width / 2, y: node.y + 40 };
  } else if (node.type === 'attribute') {
    const rx = Math.max(45, (node.label || '').length * 5 + 14);
    return { x: node.x + rx, y: node.y + 26 };
  }
  return { x: node.x, y: node.y };
};

const getIntersectionPoint = (node, targetPoint) => {
  const center = getNodeCenter(node);
  const dx = targetPoint.x - center.x;
  const dy = targetPoint.y - center.y;
  
  if (dx === 0 && dy === 0) return center;

  if (node.type === 'entity') {
    const width = Math.max(120, (node.label || '').length * 8 + 40);
    const height = 60;
    const halfW = width / 2;
    const halfH = height / 2;
    
    if (Math.abs(dx) * halfH > Math.abs(dy) * halfW) {
      const x = dx > 0 ? halfW : -halfW;
      const y = x * (dy / dx);
      return { x: center.x + x, y: center.y + y };
    } else {
      const y = dy > 0 ? halfH : -halfH;
      const x = dx === 0 ? 0 : y * (dx / dy);
      return { x: center.x + x, y: center.y + y };
    }
  } else if (node.type === 'relationship') {
    const width = Math.max(140, (node.label || '').length * 9 + 40);
    const height = 80;
    const halfW = width / 2;
    const halfH = height / 2;
    
    const t = 1 / (Math.abs(dx) / halfW + Math.abs(dy) / halfH);
    return { x: center.x + t * dx, y: center.y + t * dy };
  } else if (node.type === 'attribute') {
    const rx = Math.max(45, (node.label || '').length * 5 + 14);
    const ry = 26;
    
    const t = 1 / Math.sqrt(Math.pow(dx / rx, 2) + Math.pow(dy / ry, 2));
    return { x: center.x + t * dx, y: center.y + t * dy };
  }
  
  return center;
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
      if ((draggedOriginalNode.type === 'entity' || draggedOriginalNode.type === 'relationship') && n.type === 'attribute' && n.parentId === draggedNodeId) {
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

            const center1 = getNodeCenter(source);
            const center2 = getNodeCenter(target);
            const p1 = getIntersectionPoint(source, center2);
            const p2 = getIntersectionPoint(target, center1);

            let cardinality = null;
            let participation = null;
            let isRecursive = false;
            let curveBulge = 0;

            if (source.type === 'relationship' && target.type === 'entity') {
              isRecursive = source.parentId === source.parentId2;
              if (edge.role === '1') {
                cardinality = source.cardinality1 !== undefined ? source.cardinality1 : '1';
                participation = source.participation1;
                if (isRecursive) curveBulge = 40;
              } else if (edge.role === '2') {
                cardinality = source.cardinality2 !== undefined ? source.cardinality2 : 'N';
                participation = source.participation2;
                if (isRecursive) curveBulge = -40;
              } else {
                cardinality = target.id === source.parentId ? source.cardinality1 : source.cardinality2;
                participation = target.id === source.parentId ? source.participation1 : source.participation2;
              }
            } else if (target.type === 'relationship' && source.type === 'entity') {
              isRecursive = target.parentId === target.parentId2;
              if (edge.role === '1') {
                cardinality = target.cardinality1 !== undefined ? target.cardinality1 : '1';
                participation = target.participation1;
                if (isRecursive) curveBulge = -40;
              } else if (edge.role === '2') {
                cardinality = target.cardinality2 !== undefined ? target.cardinality2 : 'N';
                participation = target.participation2;
                if (isRecursive) curveBulge = 40;
              } else {
                cardinality = source.id === target.parentId ? target.cardinality1 : target.cardinality2;
                participation = source.id === target.parentId ? target.participation1 : target.participation2;
              }
            }

            const drawDx = p2.x - p1.x;
            const drawDy = p2.y - p1.y;
            const drawLen = Math.sqrt(drawDx * drawDx + drawDy * drawDy) || 1;
            const drawNx = -drawDy / drawLen;
            const drawNy = drawDx / drawLen;

            let pathD = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
            let curveMidX = p1.x + drawDx * 0.5;
            let curveMidY = p1.y + drawDy * 0.5;

            if (isRecursive) {
              const cx = curveMidX + drawNx * (curveBulge * 2);
              const cy = curveMidY + drawNy * (curveBulge * 2);
              pathD = `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`;
              curveMidX = (p1.x + 2 * cx + p2.x) / 4;
              curveMidY = (p1.y + 2 * cy + p2.y) / 4;
            }

            let textX = 0;
            let textY = 0;

            if (cardinality) {
              const textOffset = 16;
              const normalSign = curveBulge >= 0 ? 1 : -1;
              textX = curveMidX + drawNx * normalSign * textOffset;
              textY = curveMidY + drawNy * normalSign * textOffset;
            }

            return (
              <g key={edge.id}>
                {participation === 'total' ? (
                  <>
                    <path
                      d={pathD}
                      fill="none"
                      stroke="var(--node-stroke)"
                      strokeWidth="5"
                    />
                    <path
                      d={pathD}
                      fill="none"
                      stroke="var(--bg-color)"
                      strokeWidth="1.5"
                    />
                  </>
                ) : (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="var(--node-stroke)"
                    strokeWidth="2"
                  />
                )}
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
      
      <div style={{ position: 'absolute', bottom: '24px', left: '24px', display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 5, pointerEvents: 'none' }} className="no-export">
        <div className="zoom-controls-container glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '4px', width: 'fit-content', pointerEvents: 'auto' }}>
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
          <div style={{ display: 'flex', gap: '12px', pointerEvents: 'auto' }}>
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
