/**
 * Genesis Data SDK - the canonical data path for generated apps.
 *
 * Native read/write of a Taskade project's rows from a Genesis app - no iframe, no
 * widget, no hand-rolled fetch. `getNodes` returns ALL rows as one flat array (never
 * filter by `parentId` to find data rows); read fields with `getFieldValue` /
 * `getFieldNumber` (multi-key fallback + numeric coercion), not by indexing
 * `fieldValues` directly.
 *
 * @example
 * ```typescript
 * import { getNodes, createNode, updateNode, getFieldValue, getFieldNumber, getTitle } from '@/lib/genesis-data';
 *
 * const rows = await getNodes(projectId);
 * const titles = rows.map((row) => getTitle(row, 'Name', 'Title') ?? 'Untitled');
 * const total = rows.reduce((sum, row) => sum + (getFieldNumber(row, 'Amount') ?? 0), 0);
 * await createNode(projectId, { Name: 'Maria', Status: 'New' });
 * await updateNode(projectId, rows[0].id, { Status: 'Contacted' });
 * ```
 */
export type { GenesisNode, NewNodeFields } from './client';
export { getNodes, createNode, updateNode, deleteNode } from './client';
export { getFieldValue, getFieldNumber, getTitle } from './fields';
export type { ClientOptions } from '../genesis-gateway';
