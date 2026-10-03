export class AiError extends Error {
  constructor(
    message: string,
    readonly kind: 'config' | 'network' | 'auth' | 'refused' | 'server',
  ) {
    super(message);
  }
}
