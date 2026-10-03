/**
 * Creating a vault overwrites the keystore entries. Only the first-run flow,
 * started while no vault exists, may do it; a stray navigation can never wipe a vault.
 */
let allowCreate = false;

export function beginFirstRun(vaultExists: boolean): boolean {
  allowCreate = !vaultExists;
  return allowCreate;
}

export function mayCreateVault(): boolean {
  return allowCreate;
}

export function endFirstRun(): void {
  allowCreate = false;
}
