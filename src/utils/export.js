import { toPng } from 'html-to-image';

export function downloadSVG(svgElement, filename = 'er-diagram.svg', bbox = null) {
  if (!svgElement) return;
  
  const clone = svgElement.cloneNode(true);
  
  const uiElements = clone.querySelectorAll('.no-export');
  uiElements.forEach(el => el.remove());
  
  if (bbox) {
    clone.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    clone.setAttribute('width', bbox.width);
    clone.setAttribute('height', bbox.height);
    
    const g = clone.querySelector('g');
    if (g) {
      g.removeAttribute('transform');
    }
    const gridRect = clone.querySelector('rect[fill="url(#grid)"]');
    if (gridRect) gridRect.remove();
  }

  const styles = getComputedStyle(document.documentElement);
  const nodeStroke = styles.getPropertyValue('--node-stroke').trim() || '#0f172a';
  const nodeFill = styles.getPropertyValue('--node-fill').trim() || '#ffffff';
  const textMain = styles.getPropertyValue('--text-main').trim() || '#0f172a';
  const surfaceColor = styles.getPropertyValue('--surface-color').trim() || '#ffffff';
  const bgColor = styles.getPropertyValue('--bg-color').trim() || '#f8fafc';

  const styleContent = `
    text {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = styleContent;
  clone.insertBefore(styleEl, clone.firstChild);

  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(clone);

  source = source.replace(/var\(--node-stroke\)/g, nodeStroke);
  source = source.replace(/var\(--node-fill\)/g, nodeFill);
  source = source.replace(/var\(--text-main\)/g, textMain);
  source = source.replace(/var\(--surface-color\)/g, surfaceColor);
  source = source.replace(/var\(--bg-color\)/g, bgColor);
  source = source.replace(/var\(--border-color\)/g, '#e2e8f0');
  
  if(!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)){
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  
  source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
  
  const url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadPNG(svgContainerRef, filename = 'er-diagram.png', bbox = null) {
  if (!svgContainerRef.current) return;
  
  const originalSvg = svgContainerRef.current;
  const uiElements = originalSvg.querySelectorAll('.no-export');
  const originalStyles = [];
  
  uiElements.forEach(el => {
    originalStyles.push(el.style.display);
    el.style.display = 'none';
  });

  const originalViewBox = originalSvg.getAttribute('viewBox');
  const originalWidth = originalSvg.getAttribute('width');
  const originalHeight = originalSvg.getAttribute('height');
  
  let g;
  let originalTransform;
  let gridRect;
  let originalGridDisplay;
  
  if (bbox) {
    originalSvg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    originalSvg.setAttribute('width', bbox.width);
    originalSvg.setAttribute('height', bbox.height);
    
    g = originalSvg.querySelector('g');
    if (g) {
      originalTransform = g.getAttribute('transform');
      g.removeAttribute('transform');
    }
  }

  toPng(originalSvg, { 
    cacheBust: true, 
    backgroundColor: '#ffffff',
    width: bbox ? bbox.width : undefined,
    height: bbox ? bbox.height : undefined
  })
    .then((dataUrl) => {
      uiElements.forEach((el, idx) => { el.style.display = originalStyles[idx]; });
      if (bbox) {
        if (originalViewBox !== null) originalSvg.setAttribute('viewBox', originalViewBox);
        else originalSvg.removeAttribute('viewBox');
        if (originalWidth !== null) originalSvg.setAttribute('width', originalWidth);
        if (originalHeight !== null) originalSvg.setAttribute('height', originalHeight);
        if (g && originalTransform !== null) g.setAttribute('transform', originalTransform);
      }

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    })
    .catch((err) => {
      uiElements.forEach((el, idx) => { el.style.display = originalStyles[idx]; });
      if (bbox) {
        if (originalViewBox !== null) originalSvg.setAttribute('viewBox', originalViewBox);
        else originalSvg.removeAttribute('viewBox');
        if (originalWidth !== null) originalSvg.setAttribute('width', originalWidth);
        if (originalHeight !== null) originalSvg.setAttribute('height', originalHeight);
        if (g && originalTransform !== null) g.setAttribute('transform', originalTransform);
      }
      console.error('Error exporting PNG', err);
    });
}
