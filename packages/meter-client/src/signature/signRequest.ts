import nacl from "tweetnacl";

export function signRequest(
  privateKey: Uint8Array,
  baseString: string
): string {
  const message = new TextEncoder().encode(baseString);
  const signature = nacl.sign.detached(message, privateKey);
  return Buffer.from(signature).toString("base64");
}

