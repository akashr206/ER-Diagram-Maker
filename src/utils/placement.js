export function getNonOverlappingPosition(nodes, startX, startY, nodeWidth = 120, nodeHeight = 60) {
  if (startX === undefined || startY === undefined) {
    startX = 400;
    startY = 300;
  }
  
  let attempts = 0;
  let maxAttempts = 50;
  let offsetX = 0;
  let offsetY = 0;
  
  while (attempts < maxAttempts) {
    const x = startX + offsetX;
    const y = startY + offsetY;
    
    let overlaps = false;
    for (const node of nodes) {
      const padding = 30;
      if (
        x < node.x + (node.width || 120) + padding &&
        x + nodeWidth + padding > node.x &&
        y < node.y + (node.height || 60) + padding &&
        y + nodeHeight + padding > node.y
      ) {
        overlaps = true;
        break;
      }
    }
    
    if (!overlaps) {
      return { x: Math.round(x), y: Math.round(y) };
    }
    
    offsetX += 40;
    offsetY += 40;
    attempts++;
  }
  
  return { x: Math.round(startX), y: Math.round(startY) };
}
