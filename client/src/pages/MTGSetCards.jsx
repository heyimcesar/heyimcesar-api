import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMissingCardIds, getCard, getSetInfo } from '../api/mtgSets';

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

function CardTile({ id, card }) {
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
    <div className="bg-zinc-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-indigo-500 transition">
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
  const [cardIds, setCardIds] = useState([]);
  const [cards, setCards] = useState({});
  const [loadingIds, setLoadingIds] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [setInfo, setSetInfo] = useState(null);
  const [search, setSearch] = useState('');
  const abortRef = useRef(false);

  useEffect(() => {
    getSetInfo(setId).then(data => setSetInfo(data));
  }, [setId]);

  useEffect(() => {
    abortRef.current = false;
    setCardIds([]);
    setCards({});
    setLoadingIds(true);
    setLoadingCards(false);
    setSearch('');

    getMissingCardIds(setId).then(async (ids) => {
      setCardIds(ids);
      setLoadingIds(false);
      setLoadingCards(true);

      await fetchWithConcurrency(
        ids,
        (id) => getCard(setId, id),
        (card, id) => {
          if (abortRef.current) return;
          setCards(prev => ({ ...prev, [id]: card }));
        }
      );

      setLoadingCards(false);
    });

    return () => { abortRef.current = true; };
  }, [setId]);

  const loadedCount = Object.keys(cards).length;
  const completionPct = setInfo && !loadingIds
    ? Math.round(((setInfo.card_count - cardIds.length) / setInfo.card_count) * 100)
    : null;

  const filteredIds = search.trim() === ''
    ? cardIds
    : cardIds.filter(id => {
        const card = cards[id];
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
                {loadingIds ? '...' : cardIds.length}
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
        {loadingIds && (
          <p className="text-zinc-400 text-sm mb-4">Loading card list...</p>
        )}
        {!loadingIds && loadingCards && (
          <p className="text-zinc-400 text-sm mb-4">
            Loading card details... {loadedCount} / {cardIds.length}
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
            <CardTile key={id} id={id} card={cards[id]} />
          ))}
        </div>
      </div>
    </div>
  );
}