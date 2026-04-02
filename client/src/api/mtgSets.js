const BASE_URL = '/mtg-sets';

export async function getMySets() {
  const res = await fetch(`${BASE_URL}/my-sets`);
  return res.json();
}

export function streamMissingCards(setId, onCard, onDone) {
  const source = new EventSource(`${BASE_URL}/missing/${setId}`);

  source.onmessage = (e) => {
    const card = JSON.parse(e.data);
    onCard(card);
  };

  source.addEventListener('done', () => {
    source.close();
    onDone();
  });

  source.onerror = () => {
    source.close();
    onDone();
  };

  return source;
}