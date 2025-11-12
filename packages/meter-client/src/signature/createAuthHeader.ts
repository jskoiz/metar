export function createAuthorizationHeader(
  keyId: string,
  signature: string
): string {
  return `Signature keyId="${keyId}", alg="ed25519", headers="(request-target) date x-meter-nonce x-meter-tx", signature="${signature}"`;
}

