const BASE_URL = '/mtg-sets';

export async function getMySets() {
  const res = await fetch(`${BASE_URL}/my-sets`);
  return res.json();
}

export async function getMissingCardIds(setId) {
  const res = await fetch(`${BASE_URL}/missing-ids/${setId}`);
  return res.json();
}

export async function getOwnedCardIds(setId) {
  const res = await fetch(`${BASE_URL}/owned-ids/${setId}`);
  return res.json();
}

export async function getAllCards(setId) {
  const res = await fetch(`${BASE_URL}/cards/${setId}`);
  return res.json();
}

export async function getCard(setId, number, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(`${BASE_URL}/card/${setId}/${number}`);
    if (res.status === 429) {
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
      continue;
    }
    if (!res.ok) return null;
    return res.json();
  }
  return null;
}

export async function getSetInfo(setId) {
  const res = await fetch(`${BASE_URL}/set-info/${setId}`);
  return res.json();
}