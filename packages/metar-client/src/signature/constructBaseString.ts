export function constructSignatureBaseString(
  method: string,
  path: string,
  date: string,
  nonce: string,
  txSig: string
): string {
  const requestTarget = `${method.toLowerCase()} ${path}`;
  return [
    `(request-target): ${requestTarget}`,
    `date: ${date}`,
    `x-meter-nonce: ${nonce}`,
    `x-meter-tx: ${txSig}`,
  ].join("\n");
}
