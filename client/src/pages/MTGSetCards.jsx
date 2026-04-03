import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMissingCardIds, getOwnedCardIds, getCard, getSetInfo } from '../api/mtgSets';

const CONCURRENCY = 1;

async function fetchWithConcurrency(ids, fetchFn, onResult) {
  let index = 0;

  async function worker() {
    while (index < ids.length) {
      const current = index++;
      const result = await fetchFn(ids[current]);
      onResult(result, ids[current]);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
}

function CardTile({ id, card, foil }) {
  const [flipped, setFlipped] = useState(false);
  const canFlip = card?.back_image_uri;
  const currentImage = flipped ? card?.back_image_uri : card?.image_uri;

  if (card === null) {
    return (
      <div className="bg-zinc-900 rounded-lg overflow-hidden">
        <div className="w-full aspect-[2.5/3.5] bg-zinc-800 flex items-center justify-center text-red-600 text-xs p-2 text-center">
          Failed to load
        </div>
        <div className="p-2">
          <p className="text-xs text-zinc-500">#{id}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-indigo-500 transition relative">
      {foil && (
        <div className="absolute top-2 left-2 z-10 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow">
          Foil
        </div>
      )}
      {currentImage ? (
        <div className="relative">
          <img src={currentImage} alt={card?.name} className="w-full" />
          {canFlip && (
            <button
              onClick={() => setFlipped(prev => !prev)}
              className="absolute bottom-2 right-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg transition"
            >
              Flip
            </button>
          )}
        </div>
      ) : (
        <div className="w-full aspect-[2.5/3.5] bg-zinc-800 flex items-center justify-center text-zinc-600 text-xs p-2 text-center">
          {card === undefined ? '...' : 'No image'}
        </div>
      )}
      <div className="p-2">
        <p className="text-xs text-zinc-500">#{id}</p>
        {card !== undefined ? (
          <>
            <p className="text-xs font-medium truncate mb-1">{card.name}</p>
            <p className="text-xs text-zinc-400">Normal: ${card.price ?? '—'}</p>
            <p className="text-xs text-yellow-500">Foil: ${card.price_foil ?? '—'}</p>
            <a
              href={`https://www.tcgplayer.com/product/${card.tcgplayer_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 mt-1 block"
            >
              Buy on TCGPlayer &rarr;
            </a>
          </>
        ) : (
          <p className="text-xs text-zinc-600">Loading...</p>
        )}
      </div>
    </div>
  );
}

export default function MTGSetCards() {
  const { setId } = useParams();
  const navigate = useNavigate();

  const [view, setView] = useState('missing'); // 'missing' | 'owned'

  // Missing
  const [missingIds, setMissingIds] = useState([]);
  const [missingCards, setMissingCards] = useState({});
  const [loadingMissingIds, setLoadingMissingIds] = useState(true);
  const [loadingMissingCards, setLoadingMissingCards] = useState(false);

  // Owned
  const [ownedIds, setOwnedIds] = useState([]); // [{id, foil}]
  const [ownedCards, setOwnedCards] = useState({});
  const [loadingOwnedIds, setLoadingOwnedIds] = useState(true);
  const [loadingOwnedCards, setLoadingOwnedCards] = useState(false);

  const [setInfo, setSetInfo] = useState(null);
  const [search, setSearch] = useState('');
  const missingAbortRef = useRef(false);
  const ownedAbortRef = useRef(false);

  useEffect(() => {
    getSetInfo(setId).then(data => setSetInfo(data));
  }, [setId]);

  // Fetch missing cards
  useEffect(() => {
    missingAbortRef.current = false;
    ownedAbortRef.current = false;
    setMissingIds([]);
    setMissingCards({});
    setOwnedIds([]);
    setOwnedCards({});
    setLoadingMissingIds(true);
    setLoadingOwnedIds(true);
    setLoadingMissingCards(false);
    setLoadingOwnedCards(false);

    async function fetchAll() {
      // Fetch both ID lists in parallel (these are fast, just Google Sheets)
      const [missingIdsResult, ownedIdsResult] = await Promise.all([
        getMissingCardIds(setId),
        getOwnedCardIds(setId)
      ]);

      setMissingIds(missingIdsResult);
      setOwnedIds(ownedIdsResult);
      setLoadingMissingIds(false);
      setLoadingOwnedIds(false);

      // Fetch missing cards first
      setLoadingMissingCards(true);
      await fetchWithConcurrency(
        missingIdsResult,
        (id) => getCard(setId, id),
        (card, id) => {
          if (missingAbortRef.current) return;
          setMissingCards(prev => ({ ...prev, [id]: card }));
        }
      );
      setLoadingMissingCards(false);

      // Then fetch owned cards
      if (ownedAbortRef.current) return;
      setLoadingOwnedCards(true);
      await fetchWithConcurrency(
        ownedIdsResult.map(i => i.id),
        (id) => getCard(setId, id),
        (card, id) => {
          if (ownedAbortRef.current) return;
          setOwnedCards(prev => ({ ...prev, [id]: card }));
        }
      );
      setLoadingOwnedCards(false);
    }

    fetchAll();

    return () => {
      missingAbortRef.current = true;
      ownedAbortRef.current = true;
    };
  }, [setId]);

  const isMissing = view === 'missing';
  const activeIds = isMissing ? missingIds : ownedIds.map(i => i.id);
  const activeCards = isMissing ? missingCards : ownedCards;
  const loadingIds = isMissing ? loadingMissingIds : loadingOwnedIds;
  const loadingCards = isMissing ? loadingMissingCards : loadingOwnedCards;
  const loadedCount = Object.keys(activeCards).length;

  const completionPct = setInfo && !loadingMissingIds
    ? Math.round(((setInfo.card_count - missingIds.length) / setInfo.card_count) * 100)
    : null;

  const filteredIds = search.trim() === ''
    ? activeIds
    : activeIds.filter(id => {
        const card = activeCards[id];
        const query = search.toLowerCase();
        if (String(id).includes(query)) return true;
        if (card?.name?.toLowerCase().includes(query)) return true;
        return false;
      });

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Header */}
      <div className="relative overflow-hidden bg-zinc-950 border-b border-zinc-800 px-8 py-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/project/mtg')}
            className="text-zinc-500 hover:text-white text-sm mb-8 flex items-center gap-1 transition"
          >
            ← Back to sets
          </button>

          <div className="flex items-center gap-6">
            {setInfo?.icon_svg_uri ? (
              <img
                src={setInfo.icon_svg_uri}
                alt={setInfo.name}
                className="w-16 h-16 invert opacity-80"
              />
            ) : (
              <div className="w-16 h-16 bg-zinc-800 rounded-full" />
            )}
            <div>
              <p className="text-zinc-500 text-sm uppercase tracking-widest mb-1">{setId}</p>
              <h1 className="text-4xl font-bold">{setInfo?.name ?? setId}</h1>
              <p className="text-zinc-400 text-sm mt-1">
                {setInfo?.set_type && (
                  <span className="capitalize">{setInfo.set_type.replace('_', ' ')}</span>
                )}
                {setInfo?.released_at && (
                  <span> · Released {new Date(setInfo.released_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                )}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Total Cards</p>
              <p className="text-2xl font-bold">{setInfo?.card_count ?? '—'}</p>
            </div>
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Missing</p>
              <p className="text-2xl font-bold text-red-400">
                {loadingMissingIds ? '...' : missingIds.length}
              </p>
            </div>
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Completion</p>
              <p className="text-2xl font-bold text-green-400">
                {completionPct !== null ? `${completionPct}%` : '...'}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {completionPct !== null && (
            <div className="mt-4">
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="px-8 py-8 max-w-screen-xl mx-auto">

        {/* Toggle */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => { setView('missing'); setSearch(''); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                view === 'missing'
                  ? 'bg-red-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Missing {!loadingMissingIds && `(${missingIds.length})`}
            </button>
            <button
              onClick={() => { setView('owned'); setSearch(''); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                view === 'owned'
                  ? 'bg-green-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Have {!loadingOwnedIds && `(${ownedIds.length})`}
            </button>
          </div>
        </div>

        {loadingIds && (
          <p className="text-zinc-400 text-sm mb-4">Loading card list...</p>
        )}
        {!loadingIds && loadingCards && (
          <p className="text-zinc-400 text-sm mb-4">
            Loading card details... {loadedCount} / {activeIds.length}
          </p>
        )}

        {/* Search */}
        {!loadingIds && (
          <div className="flex items-center gap-4 mb-6">
            <input
              type="text"
              placeholder="Search by name or number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-zinc-800 text-white border border-zinc-600 rounded px-4 py-2 w-72 text-sm"
            />
            {search && (
              <span className="text-zinc-400 text-sm">
                {filteredIds.length} result{filteredIds.length !== 1 ? 's' : ''}
              </span>
            )}
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-zinc-500 hover:text-white text-sm transition"
              >
                Clear
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filteredIds.map(id => (
            <CardTile
              key={id}
              id={id}
              card={activeCards[id]}
              foil={!isMissing && ownedIds.find(i => i.id === id)?.foil}
            />
          ))}
        </div>
      </div>
    </div>
  );
}