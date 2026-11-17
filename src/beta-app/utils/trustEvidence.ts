import { EvidenceCardDocumentCount } from "../models/evidenceCard.js";

// Summing up a trust's evidence and contracts, for the trust pages and cards

// A trust procured it if any of its evidence says so, didn't if any says
// not, and otherwise hasn't reported
export const combineOutcomes = (
  outcomes: (boolean | null)[],
): boolean | null =>
  outcomes.includes(true) ? true : outcomes.includes(false) ? false : null;

// Atamis names trusts as contracting authorities, which are matched to
// organisations by name
export const countContractsByTrust = (
  contracts: { contractingAuthority: string }[],
): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const { contractingAuthority } of contracts) {
    counts.set(
      contractingAuthority,
      (counts.get(contractingAuthority) ?? 0) + 1,
    );
  }

  return counts;
};

// Each document counted once, even if it's on more than 1 piece of evidence.
// Most common type first, then A to Z.
export const countDocumentsByType = (
  documents: { documentId: number; documentType: string }[],
): EvidenceCardDocumentCount[] => {
  const documentIdsByType = new Map<string, Set<number>>();
  for (const { documentId, documentType } of documents) {
    const documentIds = documentIdsByType.get(documentType) ?? new Set();
    documentIdsByType.set(documentType, documentIds.add(documentId));
  }

  return [...documentIdsByType]
    .map(([documentType, documentIds]) => ({
      count: documentIds.size,
      documentType,
    }))
    .sort(
      (a, b) =>
        b.count - a.count || a.documentType.localeCompare(b.documentType),
    );
};
