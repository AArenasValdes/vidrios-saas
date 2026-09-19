type Listener = () => void;

let fabricacionEditorOpen = false;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

export function setFabricacionEditorOpen(open: boolean) {
  if (fabricacionEditorOpen === open) return;
  fabricacionEditorOpen = open;
  emit();
}

export function subscribeFabricacionEditorOpen(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getFabricacionEditorOpen() {
  return fabricacionEditorOpen;
}
