import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY_DIAGRAMS = 'chen_er_diagrams_v1';
const STORAGE_KEY_ACTIVE = 'chen_er_active_diagram_id_v1';

export function createDefaultDiagram(name = 'Main Diagram') {
  return {
    id: uuidv4(),
    name,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function loadStoredDiagrams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DIAGRAMS);
    if (!raw) {
      const initial = createDefaultDiagram('Main Diagram');
      saveDiagrams([initial]);
      saveActiveDiagramId(initial.id);
      return { diagrams: [initial], activeId: initial.id };
    }

    const diagrams = JSON.parse(raw);
    if (!Array.isArray(diagrams) || diagrams.length === 0) {
      const initial = createDefaultDiagram('Main Diagram');
      saveDiagrams([initial]);
      saveActiveDiagramId(initial.id);
      return { diagrams: [initial], activeId: initial.id };
    }

    let activeId = localStorage.getItem(STORAGE_KEY_ACTIVE);
    if (!activeId || !diagrams.some(d => d.id === activeId)) {
      activeId = diagrams[0].id;
      saveActiveDiagramId(activeId);
    }

    return { diagrams, activeId };
  } catch (err) {
    console.error('Failed to load diagrams from localStorage', err);
    const initial = createDefaultDiagram('Main Diagram');
    return { diagrams: [initial], activeId: initial.id };
  }
}

export function saveDiagrams(diagrams) {
  try {
    localStorage.setItem(STORAGE_KEY_DIAGRAMS, JSON.stringify(diagrams));
  } catch (err) {
    console.error('Failed to save diagrams to localStorage', err);
  }
}

export function saveActiveDiagramId(id) {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE, id);
  } catch (err) {
    console.error('Failed to save active diagram ID to localStorage', err);
  }
}
