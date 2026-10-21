// History is handled by state/store.js exports. This file re-exports them.
export { doUndo, doRedo, commitChange, snapshot, restoreSnapshot } from '../state/store.js';