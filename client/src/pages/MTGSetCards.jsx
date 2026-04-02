import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { streamMissingCards, getSetInfo } from '../api/mtgSets';

export default function MTGSetCards() {
  const { setId } = useParams();
  const navigate = useNavigate();
  const [missingCards, setMissingCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [setInfo, setSetInfo] = useState(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    getSetInfo(setId).then(data => setSetInfo(data));
  }, [setId]);

  useEffect(() => {
    if (sourceRef.current) sourceRef.current.close();
    setMissingCards([]);
    setLoadingCards(true);

    sourceRef.current = streamMissingCards(
      setId,
      (card) => setMissingCards(prev => [...prev, card]),
      () => setLoadingCards(false)
    );

    return () => {
      if (sourceRef.current) sourceRef.current.close();
    };
  }, [setId]);

  const completionPct = setInfo
    ? Math.round(((setInfo.card_count - missingCards.length) / setInfo.card_count) * 100)
    : null;

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
                {loadingCards ? '...' : missingCards.length}
              </p>
            </div>
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Completion</p>
              <p className="text-2xl font-bold text-green-400">
                {loadingCards ? '...' : `${completionPct}%`}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {!loadingCards && completionPct !== null && (
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
        {loadingCards && missingCards.length === 0 && (
          <p className="text-zinc-400 text-sm mb-4">Loading cards...</p>
        )}
        {loadingCards && missingCards.length > 0 && (
          <p className="text-zinc-400 text-sm mb-4">Loading... {missingCards.length} cards so far</p>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {missingCards.map(card => (
            <div
              key={card.id}
              className="bg-zinc-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-indigo-500 transition"
            >
              {card.image_uri ? (
                <img src={card.image_uri} alt={card.name} className="w-full" />
              ) : (
                <div className="w-full aspect-[2.5/3.5] bg-zinc-800 flex items-center justify-center text-zinc-600 text-xs p-2 text-center">
                  No image
                </div>
              )}
              <div className="p-2">
                <p className="text-xs text-zinc-500">#{card.id}</p>
                <p className="text-xs font-medium truncate mb-1">{card.name}</p>
                <p className="text-xs text-zinc-400">Normal: ${card.price ?? '—'}</p>
                <p className="text-xs text-yellow-500">Foil: ${card.price_foil ?? '—'}</p>
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
    </div>
  );
}