/**
 * Genesis Flows SDK
 *
 * Trigger Taskade automations from a Genesis app - submit a form (intake / lead capture /
 * survey) or run a webhook/manual flow. No iframe, no widget.
 *
 * @example
 * ```typescript
 * import { submitForm, runFlow } from '@/lib/genesis-flows';
 *
 * // Form intake -> FORM-trigger flow (e.g. capture a lead, then route it)
 * await submitForm(contactFormFlowId, { name, email, reason });
 *
 * // Fire an automation now -> WEBHOOK/MANUAL-trigger flow
 * await runFlow(refundFlowId, { orderId, amount });
 *
 * // Upload a document/photo for the flow to read: pass the raw File (NOT a base64
 * // data: URL). It becomes a https://files.taskade.com URL a `Convert File to Text`
 * // step can OCR.
 * await submitForm(processDocFlowId, { file, title: file.name });
 * ```
 */
export { submitForm, runFlow } from './client';
export type { ClientOptions } from '../genesis-gateway';
