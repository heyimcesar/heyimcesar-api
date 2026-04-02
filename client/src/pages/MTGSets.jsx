import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMySets } from '../api/mtgSets';

export default function MTGSets() {
  const [sets, setSets] = useState([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [sortKey, setSortKey] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const navigate = useNavigate();

  useEffect(() => {
    getMySets()
      .then(data => setSets(data))
      .finally(() => setLoadingSets(false));
  }, []);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sortedSets = [...sets].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    const cmp = typeof aVal === 'string'
      ? aVal.localeCompare(bVal)
      : aVal - bVal;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function SortIcon({ col }) {
    if (sortKey !== col) return <span className="text-zinc-600 ml-1">↕</span>;
    return <span className="text-white ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const thClass = "py-2 pr-4 cursor-pointer hover:text-white select-none";

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">MTG Sets</h1>

      {loadingSets ? (
        <p className="text-zinc-400">Loading sets...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-zinc-400 border-b border-zinc-700">
                <th className={thClass} onClick={() => handleSort('id')}>
                  ID <SortIcon col="id" />
                </th>
                <th className={thClass} onClick={() => handleSort('name')}>
                  Name <SortIcon col="name" />
                </th>
                <th className={thClass} onClick={() => handleSort('have')}>
                  Have <SortIcon col="have" />
                </th>
                <th className={`py-2 cursor-pointer hover:text-white select-none`} onClick={() => handleSort('missing')}>
                  Missing <SortIcon col="missing" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSets.map(set => (
                <tr
                  key={set.id}
                  className="border-b border-zinc-800 cursor-pointer hover:bg-zinc-900 transition"
                  onClick={() => navigate(`/project/mtg/${set.id}`)}
                >
                  <td className="py-2 pr-4 text-zinc-400">{set.id}</td>
                  <td className="py-2 pr-4 font-medium">{set.name}</td>
                  <td className="py-2 pr-4 text-green-500">{set.have}</td>
                  <td className="py-2 text-red-400">{set.missing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}