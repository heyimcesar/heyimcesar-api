const MTG_SETS_SHEET_ID = process.env.MTG_SETS_SHEET_ID;
const base = `https://docs.google.com/spreadsheets/d/${MTG_SETS_SHEET_ID}/gviz/tq?tqx=out:json`;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function getMTGSetsSheetData(set) {
  const url = set ? `${base}&sheet=${encodeURIComponent(set)}` : base;
  
  const res = await fetch(url);
  const text = await res.text();

  const jsonString = text.slice(text.indexOf('(') + 1, text.lastIndexOf(')'));
  const json = JSON.parse(jsonString);

  const headers = json.table.cols.map(col => col.label || col.id);
  const rows = json.table.rows.map(row => {
    return Object.fromEntries(
      headers.map((header, i) => [header, row.c[i]?.v ?? null])
    );
  });

  return rows;
}

export async function getMTGSetsList() {
  const data = await getMTGSetsSheetData();
  return data.slice(1).map(set => {
    return {
      id: set.A,
      name: set.B,
      have: set.D,
      missing: set.E
    };
  });
}

export async function getMissingMTGSets(set) {
  const data = await getMTGSetsSheetData(set);
  const missingCards = data.slice(1).filter(card => !card.B).map(card => card.A);

  const cards = [];
  for (const number of missingCards) {
    const scryfallCard = await getCardFromScryfall(set, number);
    console.log(scryfallCard?.prices);
    cards.push({
      id: number,
      tcgplayer_id: scryfallCard.tcgplayer_id,
      name: scryfallCard.name,
      price: scryfallCard?.prices?.usd ?? null,
      price_foil: scryfallCard?.prices?.usd_foil ?? null
    });
    await delay(100);
  }

  return cards;
}

export async function getCardFromScryfall(set, number) {
  const res = await fetch(`https://api.scryfall.com/cards/${set}/${number}`);
  const data = await res.json();
  return data;
}