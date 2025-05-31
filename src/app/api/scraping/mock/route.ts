import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// テスト用のモックポートフォリオデータ
const mockHoldings = [
  {
    code: "7203",
    name: "トヨタ自動車",
    quantity: 100,
    averagePrice: "2500.00",
    currentPrice: "2800.00",
    marketValue: "280000.00",
    gainLoss: "30000.00",
    gainLossPercent: "12.0000",
  },
  {
    code: "6758",
    name: "ソニーグループ",
    quantity: 50,
    averagePrice: "12000.00",
    currentPrice: "13500.00",
    marketValue: "675000.00",
    gainLoss: "75000.00",
    gainLossPercent: "12.5000",
  },
  {
    code: "9984",
    name: "ソフトバンクグループ",
    quantity: 200,
    averagePrice: "5000.00",
    currentPrice: "4800.00",
    marketValue: "960000.00",
    gainLoss: "-40000.00",
    gainLossPercent: "-4.0000",
  },
];

// モックデータでポートフォリオを更新
export async function POST() {
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

    console.log("🧪 モックデータでポートフォリオを更新中...");
    console.log("👤 ユーザー:", user.email, "ID:", user.id);

    // 既存のHoldingレコードを確認
    const existingHoldings = await prisma.holding.findMany({
      where: { userId: user.id },
      include: { stock: true },
    });

    console.log("📊 既存の保有株数:", existingHoldings.length);
    if (existingHoldings.length > 0) {
      console.log(
        "🔍 既存レコードの構造:",
        JSON.stringify(existingHoldings[0], null, 2)
      );
    }

    // データベースに保存
    let savedCount = 0;

    for (const holding of mockHoldings) {
      try {
        console.log(`🔄 処理中: ${holding.name} (${holding.code})`);

        // 株式情報を取得または作成
        let stock = await prisma.stock.findUnique({
          where: { code: holding.code },
        });

        if (!stock) {
          console.log("📝 新しい株式を作成:", holding.name);
          stock = await prisma.stock.create({
            data: {
              code: holding.code,
              name: holding.name,
              market: "東証プライム",
              sector: "テストセクター",
            },
          });
          console.log("✅ 株式作成完了:", stock.id);
        } else {
          console.log("✅ 既存株式を使用:", stock.id);
        }

        // 保有株式情報を更新または作成
        const existingHolding = await prisma.holding.findFirst({
          where: {
            userId: user.id,
            stockId: stock.id,
          },
        });

        if (existingHolding) {
          console.log("🔄 保有株式を更新:", existingHolding.id);

          const updateData = {
            quantity: holding.quantity,
            averagePrice: holding.averagePrice,
            currentPrice: holding.currentPrice,
            marketValue: holding.marketValue,
            gainLoss: holding.gainLoss,
            gainLossPercent: holding.gainLossPercent,
            updatedAt: new Date(),
          };

          console.log("📝 更新データ:", JSON.stringify(updateData, null, 2));

          await prisma.holding.update({
            where: { id: existingHolding.id },
            data: updateData,
          });
          console.log("✅ 保有株式更新完了");
        } else {
          console.log("🆕 新しい保有株式を作成");

          const createData = {
            userId: user.id,
            stockId: stock.id,
            quantity: holding.quantity,
            averagePrice: holding.averagePrice,
            currentPrice: holding.currentPrice,
            marketValue: holding.marketValue,
            gainLoss: holding.gainLoss,
            gainLossPercent: holding.gainLossPercent,
          };

          console.log("📝 作成データ:", JSON.stringify(createData, null, 2));
          console.log("📊 データ型チェック:");
          console.log(
            "- userId type:",
            typeof createData.userId,
            "value:",
            createData.userId
          );
          console.log(
            "- stockId type:",
            typeof createData.stockId,
            "value:",
            createData.stockId
          );
          console.log(
            "- quantity type:",
            typeof createData.quantity,
            "value:",
            createData.quantity
          );
          console.log(
            "- averagePrice type:",
            typeof createData.averagePrice,
            "value:",
            createData.averagePrice
          );

          const newHolding = await prisma.holding.create({
            data: createData,
          });
          console.log("✅ 新しい保有株式作成完了:", newHolding.id);
        }

        savedCount++;
        console.log(
          `✅ ${holding.name} (${holding.code}) のモックデータを保存完了`
        );
      } catch (error) {
        console.error(`❌ Error saving mock holding ${holding.code}:`, error);

        // より詳細なエラー情報を表示
        if (error instanceof Error) {
          console.error("❌ エラーメッセージ:", error.message);
          console.error("❌ エラー名:", error.name);
          if ("code" in error) {
            console.error("❌ エラーコード:", (error as any).code);
          }
          if ("meta" in error) {
            console.error(
              "❌ エラーメタ:",
              JSON.stringify((error as any).meta, null, 2)
            );
          }
        }

        console.error("❌ エラー詳細:", JSON.stringify(error, null, 2));
      }
    }

    console.log(`🎉 モックデータ更新完了: ${savedCount}件のデータを保存`);

    return NextResponse.json({
      success: true,
      message: "モックデータでポートフォリオを更新しました",
      count: savedCount,
      holdings: mockHoldings.map((h) => ({
        code: h.code,
        name: h.name,
        quantity: h.quantity,
        marketValue: h.marketValue,
      })),
    });
  } catch (error) {
    console.error("Error updating mock portfolio:", error);
    return NextResponse.json(
      { error: `モックデータ更新エラー: ${String(error)}` },
      { status: 500 }
    );
  }
}
