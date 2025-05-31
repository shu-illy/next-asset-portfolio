import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { decrypt } from "../../settings/sbi/route";
import puppeteer from "puppeteer";
import speakeasy from "speakeasy";

interface ScrapedHolding {
  code: string;
  name: string;
  quantity: number;
  averagePrice: string;
  currentPrice: string;
  marketValue: string;
  gainLoss: string;
  gainLossPercent: string;
}

// SBI証券からポートフォリオデータをスクレイピング
export async function POST() {
  let browser = null;
  let page = null;

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
    const totpSecret = sbiSettings.totpSecret
      ? decrypt(sbiSettings.totpSecret)
      : null;

    console.log("🚀 SBI証券スクレイピング開始:", {
      username,
      hasTotpSecret: !!totpSecret,
      totpSecretFromDB: !!sbiSettings.totpSecret,
      totpSecretLength: totpSecret ? totpSecret.length : 0,
    });

    // Puppeteerブラウザを起動（より安定した設定）
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--disable-gpu",
        "--disable-extensions",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--memory-pressure-off",
        "--max_old_space_size=4096",
      ],
      protocolTimeout: 120000, // プロトコルタイムアウトを2分に
      defaultViewport: { width: 1280, height: 720 },
    });

    page = await browser.newPage();

    // リクエストインターセプターを設定（不要なリソースをブロック）
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // ユーザーエージェントを設定
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    );

    // より詳細なエラーハンドリング
    page.on("error", (error) => {
      console.error("❌ ページエラー:", error);
    });

    page.on("pageerror", (error) => {
      console.error("❌ ページ実行エラー:", error);
    });

    // SBI証券のログインページにアクセス
    console.log("📄 SBI証券ログインページにアクセス中...");

    await page.goto("https://www.sbisec.co.jp/ETGate", {
      waitUntil: "domcontentloaded",
      timeout: 90000, // 90秒に延長
    });

    console.log("✅ ページ読み込み完了");

    // ページタイトルと要素の確認
    const pageTitle = await page.title();
    console.log("📄 ページタイトル:", pageTitle);

    // ログイン要素の待機と確認
    console.log("🔍 ログイン要素を確認中...");
    await page.waitForSelector('input[name="user_id"]', { timeout: 30000 });
    await page.waitForSelector('input[name="user_password"]', {
      timeout: 30000,
    });
    await page.waitForSelector('input[name="ACT_login"]', { timeout: 30000 });

    console.log("✅ ログイン要素を確認");

    // ログイン情報を入力（より安全な方法）
    console.log("🔑 ログイン情報を入力中...");
    await page.evaluate(
      (user, pass) => {
        const userField = document.querySelector(
          'input[name="user_id"]'
        ) as HTMLInputElement;
        const passField = document.querySelector(
          'input[name="user_password"]'
        ) as HTMLInputElement;
        if (userField) userField.value = user;
        if (passField) passField.value = pass;
      },
      username,
      password
    );

    // 少し待機
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ログインボタンをクリック（ナビゲーション待機を分離）
    console.log("🚀 ログイン実行中...");

    const navigationPromise = page.waitForNavigation({
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await page.click('input[name="ACT_login"]');
    await navigationPromise;

    console.log("✅ ログイン処理完了");

    // ログイン結果を確認
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const currentUrl = page.url();
    console.log("📍 現在のURL:", currentUrl);

    // ページが有効かチェックしてから2段階認証チェック
    let needs2FA = false;
    try {
      // ページの状態を確認
      await page.waitForFunction(() => document.readyState === "complete", {
        timeout: 10000,
      });

      needs2FA = await page.evaluate(() => {
        try {
          return (
            document.body.textContent?.includes("認証") ||
            document.body.textContent?.includes("確認") ||
            document.body.textContent?.includes("ワンタイム") ||
            !!document.querySelector(
              'input[name*="auth"], input[name*="code"], input[name*="otp"]'
            )
          );
        } catch (error) {
          console.error("❌ 2段階認証チェックエラー:", error);
          return false;
        }
      });
    } catch (evaluateError) {
      console.error("❌ ページ評価エラー:", evaluateError);
      console.log("ℹ️ ページ評価をスキップして続行");
      needs2FA = false;
    }

    if (needs2FA) {
      console.log("🔐 2段階認証が必要です");

      if (!totpSecret) {
        throw new Error(
          "2段階認証が必要ですが、TOTPシークレットが設定されていません。設定ページでTOTPシークレットを設定してください。"
        );
      }

      // TOTPコードを生成
      const totpCode = speakeasy.totp({
        secret: totpSecret,
        encoding: "base32",
        time: Date.now(),
        step: 30,
      });

      console.log("🔢 TOTPコードを生成しました");

      // 認証コード入力フィールドを探す
      const authInputSelectors = [
        'input[name*="auth"]',
        'input[name*="code"]',
        'input[name*="otp"]',
        'input[name*="認証"]',
        'input[type="text"][maxlength="6"]',
        'input[type="text"][size="6"]',
        'input[placeholder*="認証"]',
        'input[placeholder*="コード"]',
      ];

      let authInputFound = false;
      for (const selector of authInputSelectors) {
        try {
          const authInput = await page.$(selector);
          if (authInput) {
            console.log(`🎯 認証コード入力フィールドを発見: ${selector}`);
            await page.type(selector, totpCode);
            authInputFound = true;
            break;
          }
        } catch {
          console.log(`⚠️ セレクタ ${selector} で要素が見つかりませんでした`);
        }
      }

      if (!authInputFound) {
        console.log("❌ 認証コード入力フィールドが見つかりません");
        // ページの構造を確認
        try {
          const pageInfo = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll("input"));
            return {
              title: document.title,
              url: window.location.href,
              allInputs: inputs.map((input) => ({
                name: input.name,
                type: input.type,
                placeholder: input.placeholder,
                maxLength: input.maxLength,
                className: input.className,
                id: input.id,
              })),
              bodyText: document.body.textContent?.substring(0, 500),
            };
          });
          console.log(
            "🔍 2段階認証ページ情報:",
            JSON.stringify(pageInfo, null, 2)
          );
        } catch (pageInfoError) {
          console.error("❌ ページ情報取得エラー:", pageInfoError);
        }
        throw new Error("2段階認証コード入力フィールドが見つかりませんでした");
      }

      // 認証コード送信ボタンを探してクリック
      const submitSelectors = [
        'input[type="submit"]',
        'button[type="submit"]',
        'input[value*="送信"]',
        'input[value*="確認"]',
        'input[value*="認証"]',
        'button:contains("送信")',
        'button:contains("確認")',
        'button:contains("認証")',
      ];

      let submitButtonFound = false;
      for (const selector of submitSelectors) {
        try {
          const submitButton = await page.$(selector);
          if (submitButton) {
            console.log(`🚀 認証送信ボタンをクリック: ${selector}`);

            const navigationPromise = page.waitForNavigation({
              waitUntil: "domcontentloaded",
              timeout: 60000,
            });

            await page.click(selector);
            await navigationPromise;
            submitButtonFound = true;
            console.log("✅ 2段階認証完了");
            break;
          }
        } catch (error) {
          console.log(`⚠️ 送信ボタン ${selector} でエラー:`, error);
        }
      }

      if (!submitButtonFound) {
        console.log("❌ 認証送信ボタンが見つかりません");
        throw new Error("2段階認証送信ボタンが見つかりませんでした");
      }

      // 認証後少し待機
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } else {
      console.log("ℹ️ 2段階認証は不要、またはページ評価をスキップしました");
    }

    // ログインエラーチェック（より安全に）
    try {
      await page.waitForFunction(() => document.readyState === "complete", {
        timeout: 10000,
      });

      const errorElements = await page.$$eval(
        ".em, .error, .alert",
        (elements) =>
          elements.map((el) => el.textContent?.trim()).filter((text) => text)
      );

      if (errorElements.length > 0) {
        throw new Error(`ログインエラー: ${errorElements.join(", ")}`);
      }
    } catch {
      // エラー要素が見つからない場合は正常として続行
      console.log("ℹ️ エラーチェックをスキップ（ページ状態不安定）");
    }

    // ポートフォリオページに移動
    console.log("📊 ポートフォリオページに移動中...");

    const portfolioUrls = [
      "https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETmgR001Control&_PageID=WPLETmgR001Mdtl20&_DataStoreID=DSWPLETmgR001Control&_ActionID=DefaultAID&getFlg=on",
      "https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETmgR001Control&_PageID=WPLETmgR001Mdtl20",
      // 新しいポートフォリオページも試行
      "https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETpfR001Control&_PageID=WPLETpfR001Pdtl10&_DataStoreID=DSWPLETpfR001Control&_ActionID=DefaultAID",
      "https://site2.sbisec.co.jp/ETGate/?_ControlID=WPLETmgR001Control&_PageID=WPLETmgR001Mdtl20",
    ];

    let portfolioPageLoaded = false;
    for (const url of portfolioUrls) {
      try {
        console.log(`🔄 URL試行中: ${url}`);
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 90000,
        });
        portfolioPageLoaded = true;
        console.log("✅ ポートフォリオページ読み込み完了");
        break;
      } catch (error) {
        console.error(`❌ URL ${url} でエラー:`, error);
      }
    }

    if (!portfolioPageLoaded) {
      throw new Error("ポートフォリオページへのアクセスに失敗しました");
    }

    // ページが完全に読み込まれるまで待機
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // ページの詳細情報を取得（デバッグ用）
    console.log("🔍 ページ構造を詳細調査中...");

    const pageAnalysis = await page.evaluate(() => {
      const analysis = {
        title: document.title,
        url: window.location.href,
        bodyText: document.body.textContent?.substring(0, 1000),
        allTables: Array.from(document.querySelectorAll("table")).map(
          (table, index) => ({
            index,
            className: table.className,
            id: table.id,
            rows: table.querySelectorAll("tr").length,
            cells: table.querySelectorAll("td").length,
            hasNumbers: Array.from(table.querySelectorAll("td")).some(
              (td) => /\d{4}/.test(td.textContent || "") // 4桁以上の数字（証券コードなど）
            ),
            sampleText: Array.from(table.querySelectorAll("td"))
              .slice(0, 10)
              .map((td) => td.textContent?.trim())
              .filter((text) => text),
          })
        ),
        hasKeywords: {
          portfolio:
            document.body.textContent?.includes("ポートフォリオ") || false,
          holdings: document.body.textContent?.includes("保有") || false,
          stocks: document.body.textContent?.includes("株式") || false,
          securities: document.body.textContent?.includes("証券") || false,
          evaluation: document.body.textContent?.includes("評価") || false,
        },
        forms: Array.from(document.querySelectorAll("form")).map((form) => ({
          action: form.action,
          method: form.method,
          inputCount: form.querySelectorAll("input").length,
        })),
        links: Array.from(document.querySelectorAll("a"))
          .filter(
            (a) =>
              a.textContent?.includes("ポートフォリオ") ||
              a.textContent?.includes("保有") ||
              a.href?.includes("portfolio") ||
              a.href?.includes("mgR001")
          )
          .map((a) => ({
            text: a.textContent?.trim(),
            href: a.href,
          })),
      };

      return analysis;
    });

    console.log("📊 ページ分析結果:", JSON.stringify(pageAnalysis, null, 2));

    // テーブルが存在するか確認
    console.log("🔍 ポートフォリオテーブルを確認中...");

    const hasTable =
      (await page.$("table.md-l-table-01, table[class*='table'], table")) !==
      null;
    if (!hasTable) {
      console.log("⚠️ 標準テーブルが見つかりません。");
    } else {
      console.log("✅ テーブルが見つかりました");
    }

    // ポートフォリオリンクがある場合は試行
    if (pageAnalysis.links.length > 0) {
      console.log("🔗 ポートフォリオ関連リンクを発見、最初のリンクを試行中...");
      const firstLink = pageAnalysis.links[0];
      if (firstLink.href) {
        try {
          await page.goto(firstLink.href, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });
          console.log(`✅ リンク ${firstLink.text} でページ移動成功`);
          await new Promise((resolve) => setTimeout(resolve, 3000));
        } catch (linkError) {
          console.error("❌ リンク移動失敗:", linkError);
        }
      }
    }

    // ポートフォリオデータをスクレイピング（より堅牢な選択）
    console.log("🔍 ポートフォリオデータを解析中...");

    const holdings = await page.evaluate(() => {
      // より広範囲のセレクタを試行
      const possibleSelectors = [
        "table.md-l-table-01 tbody tr",
        "table[class*='table'] tbody tr",
        "table[class*='md-'] tbody tr",
        "table tbody tr",
        ".portfolio-table tr",
        "[class*='portfolio'] table tr",
        "table tr", // 最も広範囲
      ];

      let rows: Element[] = [];
      let usedSelector = "";

      for (const selector of possibleSelectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          rows = elements;
          usedSelector = selector;
          console.log(
            `📋 セレクタ '${selector}' で ${elements.length} 行を発見`
          );
          break;
        }
      }

      if (rows.length === 0) {
        console.log("⚠️ データ行が見つかりません");
        // 全てのテーブルの内容をサンプル出力
        const allTables = Array.from(document.querySelectorAll("table"));
        allTables.forEach((table, index) => {
          const rows = Array.from(table.querySelectorAll("tr"));
          console.log(`テーブル ${index + 1}: ${rows.length} 行`);
          rows.slice(0, 3).forEach((row, rowIndex) => {
            const cells = Array.from(row.querySelectorAll("td, th"));
            const cellTexts = cells
              .map((cell) => cell.textContent?.trim() || "")
              .slice(0, 5);
            console.log(`  行 ${rowIndex + 1}: [${cellTexts.join(", ")}]`);
          });
        });
        return [];
      }

      console.log(`🎯 使用セレクタ: ${usedSelector}`);

      const scrapedHoldings: ScrapedHolding[] = [];

      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll("td, th"));

        if (cells.length >= 4) {
          // さらに条件を緩和
          try {
            const cellTexts = cells.map(
              (cell) => cell.textContent?.trim() || ""
            );

            console.log(`🔍 行データ: [${cellTexts.join(" | ")}]`);

            // セルのパターンマッチング（SBI証券の一般的なレイアウト）
            let code = "";
            let name = "";
            let quantity = "0";
            let averagePrice = "0";
            let currentPrice = "0";
            let marketValue = "0";
            let gainLoss = "0";
            let gainLossPercent = "0";

            // ヘッダー行をスキップ
            if (
              cellTexts.some(
                (text) =>
                  text.includes("銘柄") ||
                  text.includes("コード") ||
                  text.includes("名称") ||
                  text.includes("株数") ||
                  text.includes("数量")
              )
            ) {
              console.log("⏭️ ヘッダー行をスキップ");
              continue;
            }

            // 証券コードらしきものを探す（4桁以上の数字）
            let codeIndex = -1;
            for (let i = 0; i < cellTexts.length; i++) {
              const text = cellTexts[i];
              const cleanText = text.replace(/[^0-9]/g, "");
              if (cleanText.length >= 4 && cleanText.length <= 6) {
                code = cleanText;
                codeIndex = i;
                break;
              }
            }

            if (codeIndex === -1) {
              console.log("⏭️ 証券コードが見つからない行をスキップ");
              continue;
            }

            // 銘柄名を探す（証券コードの次の列または前の列）
            if (codeIndex + 1 < cellTexts.length) {
              name = cellTexts[codeIndex + 1];
            } else if (codeIndex - 1 >= 0) {
              name = cellTexts[codeIndex - 1];
            }

            // 数量を探す（数字のみの列）
            for (let i = 0; i < cellTexts.length; i++) {
              if (i === codeIndex) continue;
              const text = cellTexts[i];
              const cleanText = text.replace(/[^0-9]/g, "");
              const num = Number.parseInt(cleanText, 10);
              if (num > 0 && num < 1000000 && !Number.isNaN(num)) {
                quantity = cleanText;
                break;
              }
            }

            // 価格と評価額を探す（小数点を含む数字）
            const pricePattern = /[\d,]+\.?\d*/;
            const prices = cellTexts
              .map((text) => text.replace(/[^\d.,]/g, ""))
              .filter(
                (text) =>
                  pricePattern.test(text) && text !== code && text !== quantity
              )
              .slice(0, 4); // 最大4つの価格情報

            if (prices.length >= 2) {
              averagePrice = prices[0] || "0";
              currentPrice = prices[1] || "0";
              if (prices.length >= 3) {
                marketValue = prices[2] || "0";
              }
              if (prices.length >= 4) {
                gainLoss = prices[3] || "0";
              }
            }

            // データクリーニング
            code = code.replace(/[^0-9]/g, "");
            name = name
              .replace(/^\s*[^\p{L}]*\s*/u, "")
              .replace(/\s*[^\p{L}]*\s*$/u, ""); // 記号を除去
            quantity = quantity.replace(/[^0-9]/g, "") || "0";
            averagePrice = averagePrice.replace(/[^0-9.]/g, "") || "0";
            currentPrice = currentPrice.replace(/[^0-9.]/g, "") || "0";
            marketValue = marketValue.replace(/[^0-9.]/g, "") || "0";

            // 損益計算
            const qty = Number.parseInt(quantity, 10);
            const avgPrice = Number.parseFloat(averagePrice);
            const curPrice = Number.parseFloat(currentPrice);

            if (qty > 0 && avgPrice > 0 && curPrice > 0) {
              const totalCost = qty * avgPrice;
              const currentValue = qty * curPrice;
              gainLoss = (currentValue - totalCost).toString();
              gainLossPercent = (
                ((currentValue - totalCost) / totalCost) *
                100
              ).toFixed(4);
            }

            // 有効なデータかチェック
            if (
              code &&
              code.length >= 4 &&
              name &&
              name.length > 0 &&
              Number.parseInt(quantity) > 0
            ) {
              scrapedHoldings.push({
                code,
                name,
                quantity: Number.parseInt(quantity),
                averagePrice,
                currentPrice,
                marketValue,
                gainLoss,
                gainLossPercent,
              });

              console.log(
                `📈 データ抽出成功: ${name} (${code}) - 数量: ${quantity}`
              );
            } else {
              console.log(
                `⏭️ 無効なデータをスキップ: code=${code}, name=${name}, quantity=${quantity}`
              );
            }
          } catch (error) {
            console.error("❌ 行解析エラー:", error);
          }
        }
      }

      return scrapedHoldings;
    });

    console.log(`📈 ${holdings.length}件の保有株式データを取得`);

    if (holdings.length === 0) {
      console.log("⚠️ データが取得できませんでした。ページソースを確認中...");

      // デバッグ情報を収集
      const debugInfo = await page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          bodyText: document.body.textContent?.substring(0, 500),
          tableCount: document.querySelectorAll("table").length,
          hasData: document.body.textContent?.includes("保有") || false,
        };
      });

      console.log("🐛 デバッグ情報:", JSON.stringify(debugInfo, null, 2));
    }

    // データベースに保存
    let savedCount = 0;

    for (const holding of holdings) {
      try {
        console.log(`💾 保存中: ${holding.name} (${holding.code})`);

        // 株式情報を取得または作成
        let stock = await prisma.stock.findUnique({
          where: { code: holding.code },
        });

        if (!stock) {
          stock = await prisma.stock.create({
            data: {
              code: holding.code,
              name: holding.name,
              market: "SBI証券",
              sector: "不明",
            },
          });
          console.log(`📝 新規株式作成: ${holding.name}`);
        }

        // 保有株式情報を更新または作成
        const existingHolding = await prisma.holding.findFirst({
          where: {
            userId: user.id,
            stockId: stock.id,
          },
        });

        const holdingData = {
          quantity: holding.quantity,
          averagePrice: holding.averagePrice,
          currentPrice: holding.currentPrice,
          marketValue: holding.marketValue,
          gainLoss: holding.gainLoss,
          gainLossPercent: holding.gainLossPercent,
          updatedAt: new Date(),
        };

        if (existingHolding) {
          await prisma.holding.update({
            where: { id: existingHolding.id },
            data: holdingData,
          });
          console.log(`🔄 更新完了: ${holding.name}`);
        } else {
          await prisma.holding.create({
            data: {
              userId: user.id,
              stockId: stock.id,
              ...holdingData,
            },
          });
          console.log(`🆕 新規作成: ${holding.name}`);
        }

        savedCount++;
      } catch (dbError) {
        console.error(`❌ DB保存エラー ${holding.code}:`, dbError);
      }
    }

    console.log(`✅ スクレイピング完了: ${savedCount}件のデータを保存`);

    return NextResponse.json({
      success: true,
      message: `SBI証券から${savedCount}件のポートフォリオデータを取得しました`,
      count: savedCount,
      holdings: holdings.map((h) => ({
        code: h.code,
        name: h.name,
        quantity: h.quantity,
        marketValue: h.marketValue,
      })),
    });
  } catch (error) {
    console.error("❌ スクレイピングエラー:", error);
    return NextResponse.json(
      {
        error: `SBI証券スクレイピングエラー: ${String(error)}`,
        details: error instanceof Error ? error.message : "不明なエラー",
      },
      { status: 500 }
    );
  } finally {
    // 確実にリソースを解放
    try {
      if (page) {
        await page.close();
        console.log("📄 ページを閉じました");
      }
      if (browser) {
        await browser.close();
        console.log("🔒 ブラウザを閉じました");
      }
    } catch (cleanupError) {
      console.error("❌ クリーンアップエラー:", cleanupError);
    }
  }
}
