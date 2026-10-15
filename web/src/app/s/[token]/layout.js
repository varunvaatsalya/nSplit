export const metadata = {
  title: "Shared ledger · nSplit",
  description: "A read-only view of a group's expenses and balances.",
  // Share links are private to whoever holds them; keep them out of search engines.
  robots: { index: false, follow: false },
};

export default function SharedLedgerLayout({ children }) {
  return children;
}
