import { useState, useEffect, useRef } from 'react';
import { getMySets, streamMissingCards } from '../api/mtgSets';

export default function MTGSets() {
  const [sets, setSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [missingCards, setMissingCards] = useState([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const ref = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    getMySets()
      .then(data => setSets(data))
      .finally(() => setLoadingSets(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSelectSet(set) {
    setSelectedSet(set);
    setSearch(set.name);
    setShowDropdown(false);
    setMissingCards([]);

    if (sourceRef.current) sourceRef.current.close();

    setLoadingCards(true);
    sourceRef.current = streamMissingCards(
      set.id,
      (card) => setMissingCards(prev => [...prev, card]),
      () => setLoadingCards(false)
    );
  }

  const filteredSets = sets.filter(set =>
    set.name.toLowerCase().includes(search.toLowerCase()) ||
    set.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">MTG Sets</h1>

      {loadingSets ? (
        <p className="text-zinc-400">Loading sets...</p>
      ) : (
        <div className="relative w-72 mb-8" ref={ref}>
          <input
            type="text"
            placeholder="Search a set..."
            className="bg-zinc-800 text-white border border-zinc-600 rounded px-4 py-2 w-full"
            value={search}
            onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
          />
          {showDropdown && filteredSets.length > 0 && (
            <ul className="absolute z-10 w-full bg-zinc-800 border border-zinc-600 rounded mt-1 max-h-60 overflow-y-auto">
              {filteredSets.map(set => (
                <li
                  key={set.id}
                  className="px-4 py-2 hover:bg-zinc-700 cursor-pointer text-sm"
                  onMouseDown={() => handleSelectSet(set)}
                >
                  <span className="text-zinc-400 mr-2">{set.id}</span>{set.name}
                  <span className="text-zinc-500 ml-2 text-xs">({set.missing} missing)</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(loadingCards || missingCards.length > 0) && (
        <div>
          <h2 className="text-xl font-semibold mb-6">
            Missing Cards — {loadingCards ? 'loading...' : `${missingCards.length} total`}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {missingCards.map(card => (
              <div
                key={card.id}
                className="bg-zinc-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-zinc-500 transition"
              >
                {card.image_uri ? (
                  <img
                    src={card.image_uri}
                    alt={card.name}
                    className="w-full"
                  />
                ) : (
                  <div className="w-full aspect-[2.5/3.5] bg-zinc-800 flex items-center justify-center text-zinc-600 text-xs p-2 text-center">
                    No image
                  </div>
                )}
                <div className="p-2">
                  <p className="text-xs text-zinc-500">#{card.id}</p>
                  <p className="text-xs font-medium truncate mb-1">{card.name}</p>
                  <p className="text-xs text-zinc-400">
                    Normal: ${card.price ?? '—'}
                  </p>
                  <p className="text-xs text-yellow-500">
                    Foil: ${card.price_foil ?? '—'}
                  </p>
                  <a
                    href={`https://www.tcgplayer.com/product/${card.tcgplayer_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 mt-1 block"
                  >
                    Buy on TCGPlayer →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}