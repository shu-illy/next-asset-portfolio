interface StockInfo {
  code: string;
  name: string;
  market: string;
  sector?: string;
}

export async function scrapeStockInfo(stockCode: string): Promise<StockInfo | null> {
  try {
    // Yahoo Financeから株式情報を取得
    const response = await fetch(`https://finance.yahoo.co.jp/quote/${stockCode}.T`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch stock info for ${stockCode}: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // HTMLから株式名を抽出
    const nameMatch = html.match(/<title>([^【]+)【(\d+)】/);
    const stockName = nameMatch ? nameMatch[1].trim() : `銘柄${stockCode}`;

    // セクター情報を抽出
    const sectorMatch = html.match(/業種[：:]([^<\n]+)/);
    const sector = sectorMatch ? sectorMatch[1].trim() : undefined;

    // 市場情報を抽出
    const marketMatch = html.match(/市場[：:]([^<\n]+)/);
    const market = marketMatch ? marketMatch[1].trim() : "東証";

    return {
      code: stockCode,
      name: stockName,
      market,
      sector,
    };
  } catch (error) {
    console.error(`Error scraping stock info for ${stockCode}:`, error);
    return null;
  }
}

export async function scrapeStockInfoStrict(stockCode: string): Promise<StockInfo> {
  const scrapedInfo = await scrapeStockInfo(stockCode);

  if (!scrapedInfo) {
    throw new Error(`銘柄情報の取得に失敗しました: ${stockCode}`);
  }

  return scrapedInfo;
}
