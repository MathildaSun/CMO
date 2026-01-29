import { handleApproval } from '../../lib/approval.js';

type SlackUser = { id?: string; username?: string; name?: string };
type SlackAction = { action_id?: string };
export type SlackInteractionPayload = { actions?: SlackAction[]; user?: SlackUser };

export async function handleSlackInteraction(payload: SlackInteractionPayload) {
  try {
    const action = Array.isArray(payload.actions) ? payload.actions[0] : undefined;
    const actionId = action?.action_id ?? '';
    const user = payload.user || {};
    const username = user.username || user.name || user.id || 'unknown-user';

    if (actionId.startsWith('approve_')) {
      const approvalId = actionId.replace('approve_', '');
      await handleApproval(approvalId, true, username);
    } else if (actionId.startsWith('reject_')) {
      const approvalId = actionId.replace('reject_', '');
      await handleApproval(approvalId, false, username);
    }

    return { response_action: 'clear' } as const;
  } catch {
    return { response_action: 'errors', errors: { _error: 'Failed to process interaction' } } as const;
  }
}
