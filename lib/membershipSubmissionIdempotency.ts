export type MembershipSubmissionState = {
  inProgress: boolean;
  pending: { fingerprint: string; key: string } | null;
};

export function createMembershipSubmissionState(): MembershipSubmissionState {
  return { inProgress: false, pending: null };
}

export function beginMembershipSubmission(
  state: MembershipSubmissionState,
  fingerprint: string,
  createKey: () => string = () => globalThis.crypto.randomUUID()
): string | null {
  if (state.inProgress) return null;

  if (state.pending?.fingerprint !== fingerprint) {
    state.pending = { fingerprint, key: createKey() };
  }
  state.inProgress = true;
  return state.pending.key;
}

export function finishMembershipSubmission(state: MembershipSubmissionState) {
  state.inProgress = false;
}

export function completeMembershipSubmission(state: MembershipSubmissionState) {
  state.pending = null;
  state.inProgress = false;
}
