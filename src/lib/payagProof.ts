import { encodePacked, keccak256 } from 'viem';

export function generateProofHash(data: string): `0x${string}` {
  return keccak256(encodePacked(['string'], [data]));
}
