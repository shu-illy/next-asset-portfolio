import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "../../settings/sbi/route";
import puppeteer from "puppeteer";

interface ScrapedHolding {
  code: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

// SBI証券からポートフォリオデータをスクレイピング
export async function POST() {
  let browser = null;

  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const sbiSettings = await prisma.sbiSettings.findUnique({
      where: { userId: user.id },
    });

    if (!sbiSettings) {
      return NextResponse.json(
        { error: "SBI証券の設定が見つかりません" },
        { status: 400 }
      );
    }

    // 復号化してログイン情報を取得
    const username = sbiSettings.username;
    const password = decrypt(sbiSettings.password);

    console.log("SBI証券スクレイピング開始:", { username });

    // Puppeteerブラウザを起動
    browser = await puppeteer.launch({
      headless: true, // 本番では true、デバッグ時は false
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
      ],
    });

    const page = await browser.newPage();

    // ユーザーエージェントを設定
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // SBI証券のログインページにアクセス
    console.log("📄 SBI証券ログインページにアクセス中...");
    await page.goto("https://www.sbisec.co.jp/ETGate", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // ログイン情報を入力
    console.log("🔑 ログイン情報を入力中...");
    await page.type('input[name="user_id"]', username);
    await page.type('input[name="user_password"]', password);

    // ログインボタンをクリック
    console.log("🚀 ログイン実行中...");
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }),
      page.click('input[name="ACT_login"]'),
    ]);

    // ログインエラーチェック
    const loginError = await page.$(".em");
    if (loginError) {
      const errorText = await page.evaluate((el) => el.textContent, loginError);
      throw new Error(`ログインエラー: ${errorText || "不明なエラー"}`);
    }

    console.log("✅ ログイン成功");

    // ポートフォリオページに移動
    console.log("📊 ポートフォリオページに移動中...");
    await page.goto(
      "https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETmgR001Control&_PageID=WPLETmgR001Mdtl20&_DataStoreID=DSWPLETmgR001Control&_ActionID=DefaultAID&getFlg=on",
      {
        waitUntil: "networkidle2",
        timeout: 30000,
      }
    );

    // ポートフォリオデータをスクレイピング
    console.log("🔍 ポートフォリオデータを解析中...");

    const holdings = await page.evaluate(() => {
      const rows = Array.from(
        document.querySelectorAll("table.md-l-table-01 tbody tr")
      );
      const scrapedHoldings: ScrapedHolding[] = [];

      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll("td"));

        if (cells.length >= 8) {
          try {
            const code = cells[0]?.textContent?.trim() || "";
            const name = cells[1]?.textContent?.trim() || "";
            const quantity = Number.parseInt(
              cells[2]?.textContent?.replace(/,/g, "") || "0",
              10
            );
            const averagePrice = Number.parseFloat(
              cells[3]?.textContent?.replace(/,/g, "") || "0"
            );
            const currentPrice = Number.parseFloat(
              cells[4]?.textContent?.replace(/,/g, "") || "0"
            );
            const marketValue = Number.parseFloat(
              cells[5]?.textContent?.replace(/,/g, "") || "0"
            );
            const gainLoss = Number.parseFloat(
              cells[6]?.textContent?.replace(/,/g, "") || "0"
            );
            const gainLossPercent = Number.parseFloat(
              cells[7]?.textContent?.replace(/%/g, "") || "0"
            );

            if (code && name && quantity > 0) {
              scrapedHoldings.push({
                code,
                name,
                quantity,
                averagePrice,
                currentPrice,
                marketValue,
                gainLoss,
                gainLossPercent,
              });
            }
          } catch (error) {
            console.error("Row parsing error:", error);
          }
        }
      }

      return scrapedHoldings;
    });

    console.log(`📈 ${holdings.length}件の保有株式データを取得`);

    // データベースに保存
    let savedCount = 0;

    for (const holding of holdings) {
      try {
        // 株式情報を取得または作成
        let stock = await prisma.stock.findUnique({
          where: { code: holding.code },
        });

        if (!stock) {
          stock = await prisma.stock.create({
            data: {
              code: holding.code,
              name: holding.name,
              market: "不明",
              sector: "不明",
            },
          });
        }

        // 保有株式情報を更新または作成
        const existingHolding = await prisma.holding.findFirst({
          where: {
            userId: user.id,
            stockId: stock.id,
          },
        });

        if (existingHolding) {
          await prisma.holding.update({
            where: { id: existingHolding.id },
            data: {
              quantity: holding.quantity,
              averagePrice: holding.averagePrice,
              currentPrice: holding.currentPrice,
              marketValue: holding.marketValue,
              gainLoss: holding.gainLoss,
              gainLossPercent: holding.gainLossPercent,
              updatedAt: new Date(),
            },
          });
        } else {
          await prisma.holding.create({
            data: {
              userId: user.id,
              stockId: stock.id,
              quantity: holding.quantity,
              averagePrice: holding.averagePrice,
              currentPrice: holding.currentPrice,
              marketValue: holding.marketValue,
              gainLoss: holding.gainLoss,
              gainLossPercent: holding.gainLossPercent,
            },
          });
        }

        savedCount++;
        console.log(`💾 ${holding.name} (${holding.code}) のデータを保存`);
      } catch (error) {
        console.error(`Error saving holding ${holding.code}:`, error);
      }
    }

    console.log(`✅ スクレイピング完了: ${savedCount}件のデータを保存`);

    return NextResponse.json({
      success: true,
      message: "ポートフォリオデータを取得しました",
      count: savedCount,
      holdings: holdings.map((h) => ({
        code: h.code,
        name: h.name,
        quantity: h.quantity,
        marketValue: h.marketValue,
      })),
    });
  } catch (error) {
    console.error("Error scraping SBI portfolio:", error);
    return NextResponse.json(
      { error: `スクレイピングエラー: ${String(error)}` },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
      console.log("🔒 ブラウザを閉じました");
    }
  }
}
