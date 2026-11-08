import type { Role } from "@/lib/types";

// Who may press "Confirm receipt & file" (the final step that closes a record).
//
// Executives only: the Executive Assistant, whose job this is in the routing
// pathway, and the Executive. The ADMIN login acts as the Executive, so it can
// too. Supervisors, specialty leads and staff cannot.
//
// One list, used by the server rule (lib/workflow/transition.ts) and by the EA
// page and record page that show the button, so they cannot disagree.
// No server imports here, so client components can use it.
export const RECEIPT_ROLES: readonly Role[] = ["EXEC_ASSISTANT", "EXECUTIVE"];

export function canConfirmReceipt(role: Role | string | null | undefined): boolean {
  return RECEIPT_ROLES.includes(role as Role);
}
