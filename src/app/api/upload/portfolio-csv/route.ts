import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { scrapeStockInfoStrict } from "@/lib/stock-scraper";

interface ParsedHolding {
  code: string;
  name: string;
  quantity: number;
  averagePrice: string;
  currentPrice: string;
  marketValue: string;
  gainLoss: string;
  type: "stock" | "fund";
  account: string;
}

function parseShiftJISCsv(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder("shift_jis");
  return decoder.decode(buffer);
}

function cleanNumericValue(value: string): string {
  return value.replace(/[,\s]/g, "").replace(/[^\d.-]/g, "") || "0";
}

function parseStockData(lines: string[], startIndex: number): ParsedHolding[] {
  const holdings: ParsedHolding[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (
      !line ||
      line.includes("合計") ||
      line.includes("保有証券") ||
      line.includes("投資信託")
    ) {
      break;
    }

    const columns = line.split(",").map((col) => col.replace(/"/g, "").trim());

    if (columns.length >= 9 && columns[0].match(/^\d{4}$/)) {
      const code = columns[0];
      const name = columns[1];
      const quantity = parseInt(cleanNumericValue(columns[2])) || 0;
      const averagePrice = cleanNumericValue(columns[4]);
      const currentPrice = cleanNumericValue(columns[5]);
      const acquisitionValue = cleanNumericValue(columns[6]);
      const marketValue = cleanNumericValue(columns[7]);
      const gainLoss = cleanNumericValue(columns[8]);

      if (quantity > 0 && code.length === 4) {
        holdings.push({
          code,
          name,
          quantity,
          averagePrice,
          currentPrice,
          marketValue,
          gainLoss,
          type: "stock",
          account: "specific",
        });
      }
    }
  }

  return holdings;
}

function parseFundData(
  lines: string[],
  startIndex: number,
  accountType: string
): ParsedHolding[] {
  const holdings: ParsedHolding[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (
      !line ||
      line.includes("合計") ||
      line.includes("保有証券") ||
      line.includes("投資信託")
    ) {
      break;
    }

    const columns = line.split(",").map((col) => col.replace(/"/g, "").trim());

    if (columns.length >= 9 && columns[0].includes("三井住友")) {
      const fullName = columns[0];
      const parts = fullName.split("｜");
      const fundName = parts[0] || fullName;

      const code = `FUND_${fundName.slice(0, 10)}`;
      const quantityStr = columns[1].replace(/口/g, "");
      const quantity = parseInt(cleanNumericValue(quantityStr)) || 0;
      const averagePrice = cleanNumericValue(columns[3]);
      const currentPrice = cleanNumericValue(columns[4]);
      const acquisitionValue = cleanNumericValue(columns[5]);
      const marketValue = cleanNumericValue(columns[6]);
      const gainLoss = cleanNumericValue(columns[7]);

      if (quantity > 0) {
        holdings.push({
          code,
          name: fundName,
          quantity,
          averagePrice,
          currentPrice,
          marketValue,
          gainLoss,
          type: "fund",
          account: accountType,
        });
      }
    }
  }

  return holdings;
}

function parseSbiCsv(csvContent: string): ParsedHolding[] {
  const lines = csvContent.split("\n");
  const holdings: ParsedHolding[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.includes("株式（特定預り）")) {
      const stockStartIndex = i + 3;
      holdings.push(...parseStockData(lines, stockStartIndex));
    } else if (line.includes("株式（NISA預り（成長投資枠）")) {
      const stockStartIndex = i + 3;
      const nisaStocks = parseStockData(lines, stockStartIndex);
      nisaStocks.forEach((stock) => (stock.account = "nisa"));
      holdings.push(...nisaStocks);
    } else if (line.includes("投資信託（特定/一般預り）")) {
      const fundStartIndex = i + 3;
      holdings.push(...parseFundData(lines, fundStartIndex, "specific"));
    } else if (line.includes("投資信託（特定/NISA預り（みらい環境投資枠）")) {
      const fundStartIndex = i + 3;
      holdings.push(...parseFundData(lines, fundStartIndex, "nisa_growth"));
    } else if (line.includes("投資信託（つみたてNISA預り）")) {
      const fundStartIndex = i + 3;
      holdings.push(...parseFundData(lines, fundStartIndex, "nisa_tsumitate"));
    }
  }

  return holdings;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "CSVファイルが見つかりません" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "CSVファイルを選択してください" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    let csvContent: string;

    try {
      csvContent = parseShiftJISCsv(buffer);
    } catch {
      const decoder = new TextDecoder("utf-8");
      csvContent = decoder.decode(buffer);
    }

    console.debug(csvContent);
    const parsedHoldings = parseSbiCsv(csvContent);

    if (parsedHoldings.length === 0) {
      return NextResponse.json(
        {
          error:
            "有効な保有データが見つかりませんでした。SBI証券の保有証券一覧CSVファイルを確認してください。",
        },
        { status: 400 }
      );
    }

    let savedCount = 0;
    const scrapingResults: Array<{
      code: string;
      success: boolean;
      error?: string;
    }> = [];
    const scrapingErrors: string[] = [];

    for (const holding of parsedHoldings) {
      try {
        let stock = await prisma.stock.findUnique({
          where: { code: holding.code },
        });

        if (!stock) {
          let stockInfo;
          let scrapingSuccess = false;
          let scrapingError: string | undefined;

          // 投資信託でない場合（株式コード4桁）はスクレイピングを試行
          if (holding.type === "stock" && holding.code.match(/^\d{4}$/)) {
            try {
              console.log(
                `📡 銘柄情報をスクレイピング中: ${holding.code} - ${holding.name}`
              );
              stockInfo = await scrapeStockInfoStrict(holding.code);
              scrapingSuccess = true;
              console.log(
                `✅ スクレイピング成功: ${stockInfo.name} (${stockInfo.code})`
              );
            } catch (error) {
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : `銘柄情報の取得に失敗: ${holding.code}`;
              console.error(
                `❌ スクレイピング失敗 ${holding.code}:`,
                errorMessage
              );
              scrapingError = errorMessage;
              scrapingErrors.push(`${holding.code}: ${errorMessage}`);

              // スクレイピング失敗時はCSV処理を継続せずエラーを返す
              throw new Error(
                `銘柄情報の自動取得に失敗しました: ${holding.code} (${holding.name}). 手動で銘柄情報を確認してください。`
              );
            }
          } else {
            // 投資信託などはスクレイピング対象外
            stockInfo = {
              code: holding.code,
              name: holding.name,
              market: "SBI証券",
              sector: holding.type === "fund" ? "投資信託" : "株式",
            };
          }

          if (holding.type === "stock" && holding.code.match(/^\d{4}$/)) {
            scrapingResults.push({
              code: holding.code,
              success: scrapingSuccess,
              error: scrapingError,
            });
          }

          stock = await prisma.stock.create({
            data: {
              code: stockInfo.code,
              name: stockInfo.name,
              market: stockInfo.market,
              sector:
                stockInfo.sector ||
                (holding.type === "fund" ? "投資信託" : "株式"),
            },
          });

          console.log(
            `💾 新規株式情報を保存: ${stockInfo.name} (${stockInfo.code})`
          );
        }

        const existingHolding = await prisma.holding.findFirst({
          where: {
            userId: user.id,
            stockId: stock.id,
          },
        });

        const gainLossNum = parseFloat(holding.gainLoss) || 0;
        const marketValueNum = parseFloat(holding.marketValue) || 0;
        const gainLossPercent =
          marketValueNum > 0 && gainLossNum !== 0
            ? ((gainLossNum / (marketValueNum - gainLossNum)) * 100).toFixed(4)
            : "0";

        const holdingData = {
          quantity: holding.quantity,
          averagePrice: holding.averagePrice,
          currentPrice: holding.currentPrice,
          marketValue: holding.marketValue,
          gainLoss: holding.gainLoss,
          gainLossPercent,
          updatedAt: new Date(),
        };

        if (existingHolding) {
          await prisma.holding.update({
            where: { id: existingHolding.id },
            data: holdingData,
          });
        } else {
          await prisma.holding.create({
            data: {
              userId: user.id,
              stockId: stock.id,
              ...holdingData,
            },
          });
        }

        savedCount++;
      } catch (dbError) {
        console.error(`DB保存エラー ${holding.code}:`, dbError);
      }
    }

    const scrapedCount = scrapingResults.filter((r) => r.success).length;
    const message =
      scrapedCount > 0
        ? `CSVから${savedCount}件のポートフォリオデータを取得しました（${scrapedCount}件の銘柄情報を自動取得）`
        : `CSVから${savedCount}件のポートフォリオデータを取得しました`;

    return NextResponse.json({
      success: true,
      message,
      count: savedCount,
      scrapingResults: {
        total: scrapingResults.length,
        successful: scrapedCount,
        details: scrapingResults,
      },
      holdings: parsedHoldings.map((h) => ({
        code: h.code,
        name: h.name,
        quantity: h.quantity,
        type: h.type,
        account: h.account,
      })),
    });
  } catch (error) {
    console.error("CSV upload error:", error);
    return NextResponse.json(
      {
        error: `CSVアップロードエラー: ${String(error)}`,
        details: error instanceof Error ? error.message : "不明なエラー",
      },
      { status: 500 }
    );
  }
}
