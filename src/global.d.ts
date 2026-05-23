// Global ambient types — kept out of .svelte files because their <script lang="ts">
// blocks don't allow top-level ambient module declarations.

interface GsiCredentialResponse {
  credential: string;
  select_by?: string;
}

interface GoogleId {
  initialize: (opts: { client_id: string; callback: (r: GsiCredentialResponse) => void }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
  prompt: () => void;
}

interface Window {
  google?: { accounts: { id: GoogleId } };
}
