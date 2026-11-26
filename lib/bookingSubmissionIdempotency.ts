export type BookingSubmissionState = {
  inProgress: boolean;
  pending: { fingerprint: string; key: string } | null;
};

export function createBookingSubmissionState(): BookingSubmissionState {
  return { inProgress: false, pending: null };
}

export function beginBookingSubmission(
  state: BookingSubmissionState,
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

export function finishBookingSubmission(state: BookingSubmissionState) {
  state.inProgress = false;
}

export function completeBookingSubmission(state: BookingSubmissionState) {
  state.pending = null;
  state.inProgress = false;
}
