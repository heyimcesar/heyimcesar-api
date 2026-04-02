import { useState, useEffect } from 'react';
import { getMySets, getMissingCards } from '../api/mtgSets';

export default function MTGSets() {
  const [sets, setSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState('');
  const [missingCards, setMissingCards] = useState([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);

  useEffect(() => {
    getMySets()
      .then(data => setSets(data))
      .finally(() => setLoadingSets(false));
  }, []);

  async function handleSetChange(e) {
    const setId = e.target.value;
    setSelectedSet(setId);
    setMissingCards([]);
    if (!setId) return;
    setLoadingCards(true);
    const cards = await getMissingCards(setId);
    setMissingCards(cards);
    setLoadingCards(false);
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">MTG Sets</h1>

      {loadingSets ? (
        <p className="text-zinc-400">Loading sets...</p>
      ) : (
        <select
          className="bg-zinc-800 text-white border border-zinc-600 rounded px-4 py-2 mb-8 w-full max-w-md"
          value={selectedSet}
          onChange={handleSetChange}
        >
          <option value="">Select a set...</option>
          {sets.map(set => (
            <option key={set.id} value={set.id}>
              ({set.id}) {set.name}
            </option>
          ))}
        </select>
      )}

      {loadingCards && <p className="text-zinc-400">Loading missing cards...</p>}

      {missingCards.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Missing Cards — {missingCards.length} total
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-zinc-400 border-b border-zinc-700">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2">Foil Price</th>
                </tr>
              </thead>
              <tbody>
                {missingCards.map(card => (
                  <tr key={card.id} className="border-b border-zinc-800 hover:bg-zinc-900">
                    <td className="py-2 pr-4 text-zinc-400">{card.id}</td>
                    <td className="py-2 pr-4"><a href={`https://www.tcgplayer.com/product/${card.tcgplayer_id}`} target="_blank" rel="noopener noreferrer">{card.name}</a></td>
                    <td className="py-2 pr-4">${card.price ?? '—'}</td>
                    <td className="py-2">${card.price_foil ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}