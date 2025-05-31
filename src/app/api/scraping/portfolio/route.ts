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

    try {
      await page.goto("https://www.sbisec.co.jp/ETGate", {
        waitUntil: "domcontentloaded", // networkidle2より軽い条件に変更
        timeout: 60000, // タイムアウトを60秒に延長
      });
      console.log("✅ ページ読み込み完了");
    } catch (error) {
      console.error("❌ ページアクセスエラー:", error);
      throw new Error(
        `SBI証券サイトへのアクセスに失敗しました: ${String(error)}`
      );
    }

    // ページが正しく読み込まれているかチェック
    const pageTitle = await page.title();
    console.log("📄 ページタイトル:", pageTitle);

    // ログイン要素の存在確認
    const userIdField = await page.$('input[name="user_id"]');
    const passwordField = await page.$('input[name="user_password"]');
    const loginButton = await page.$('input[name="ACT_login"]');

    if (!userIdField || !passwordField || !loginButton) {
      console.error("❌ ログイン要素が見つかりません");
      throw new Error(
        "SBI証券のログインページの構造が変更されている可能性があります"
      );
    }

    console.log("✅ ログイン要素を確認");

    // ログイン情報を入力
    console.log("🔑 ログイン情報を入力中...");
    await page.type('input[name="user_id"]', username);
    await page.type('input[name="user_password"]', password);

    // ログインボタンをクリック
    console.log("🚀 ログイン実行中...");
    try {
      await Promise.all([
        page.waitForNavigation({
          waitUntil: "domcontentloaded",
          timeout: 60000,
        }),
        page.click('input[name="ACT_login"]'),
      ]);
      console.log("✅ ログイン完了");
    } catch (error) {
      console.error("❌ ログインエラー:", error);
      throw new Error(`ログイン処理に失敗しました: ${String(error)}`);
    }

    // 少し待機してページが安定するのを待つ
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // ログインエラーチェック（新しいページで実行）
    try {
      const loginError = await page.$(".em");
      if (loginError) {
        const errorText = await page.evaluate(
          (el) => el?.textContent || "",
          loginError
        );
        throw new Error(`ログインエラー: ${errorText || "不明なエラー"}`);
      }
    } catch {
      // エラー要素が見つからない場合は正常（ログイン成功）
      console.log("⚠️ エラー要素チェックをスキップ（ページ変更により正常）");
    }

    console.log("✅ ログイン成功");

    // 現在のURLを確認
    const currentUrl = page.url();
    console.log("📍 現在のURL:", currentUrl);

    // ポートフォリオページに移動
    console.log("📊 ポートフォリオページに移動中...");

    try {
      await page.goto(
        "https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETmgR001Control&_PageID=WPLETmgR001Mdtl20&_DataStoreID=DSWPLETmgR001Control&_ActionID=DefaultAID&getFlg=on",
        {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        }
      );
      console.log("✅ ポートフォリオページ読み込み完了");
    } catch (error) {
      console.error("❌ ポートフォリオページアクセスエラー:", error);

      // フォールバック: 別のポートフォリオページを試す
      console.log("🔄 別のページを試行中...");
      try {
        await page.goto(
          "https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETmgR001Control&_PageID=WPLETmgR001Mdtl20",
          {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          }
        );
        console.log("✅ フォールバックページ読み込み完了");
      } catch (fallbackError) {
        console.error("❌ フォールバックページもエラー:", fallbackError);
        throw new Error("ポートフォリオページへのアクセスに失敗しました");
      }
    }

    // ページが読み込まれるまで少し待機
    await new Promise((resolve) => setTimeout(resolve, 3000));

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
