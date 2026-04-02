const BASE_URL = '/mtg-sets';

export async function getMySets() {
  const res = await fetch(`${BASE_URL}/my-sets`);
  return res.json();
}

export async function getMissingCards(setId) {
  const res = await fetch(`${BASE_URL}/missing/${setId}`);
  return res.json();
}