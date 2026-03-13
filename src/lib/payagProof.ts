import { keccak256, stringToHex } from 'viem';

export function generateProofHash(data: string): `0x${string}` {
  return keccak256(stringToHex(data));
}


