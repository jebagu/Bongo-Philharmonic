/** Public releases deliberately have no local-only native sound bank. */
export async function loadMarioPaintManifest(..._args: unknown[]): Promise<never> {
  throw Error('This sound set is available in the local application only.');
}
export async function loadMarioPaintInstrument(..._args: unknown[]): Promise<never> {
  throw Error('This sound set is available in the local application only.');
}
