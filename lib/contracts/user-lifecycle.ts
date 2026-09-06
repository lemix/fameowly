/**
 * Contract: user lifecycle events.
 * Lets plugins drop data they keep outside users.json.
 */

export interface UserLifecycle {
  onUserDeleted(userId: string): Promise<void>;
}
