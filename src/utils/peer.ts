export function parsePeerId(peerId: string): string {
  if (!peerId) return "Unknown";
  try {
    const decoded = decodeURIComponent(peerId);
    if (decoded.startsWith("-u")) {
      return decoded.substring(2).trim() || "Unknown";
    }
    if (decoded.startsWith("-i")) {
      return "Unknown (ID)";
    }
  } catch (e) {}
  return "Unknown";
}

function countSetBits(n: number): number {
  let count = 0;
  while (n > 0) {
    n &= (n - 1);
    count++;
  }
  return count;
}

export function calculatePeerProgress(bitfield: string, totalPieces: number): number {
  if (!bitfield || totalPieces === 0) return 0;
  let setBits = 0;
  for (let i = 0; i < bitfield.length; i++) {
    setBits += countSetBits(bitfield.charCodeAt(i));
  }
  return Math.min(100, Math.round((setBits / totalPieces) * 100));
}