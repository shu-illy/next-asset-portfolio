import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const japaneseStocks = [
  {
    code: "7203",
    name: "トヨタ自動車",
    market: "東証プライム",
    sector: "輸送用機器",
  },
  {
    code: "6758",
    name: "ソニーグループ",
    market: "東証プライム",
    sector: "電気機器",
  },
  {
    code: "9984",
    name: "ソフトバンクグループ",
    market: "東証プライム",
    sector: "情報・通信業",
  },
  {
    code: "6861",
    name: "キーエンス",
    market: "東証プライム",
    sector: "電気機器",
  },
  {
    code: "4519",
    name: "中外製薬",
    market: "東証プライム",
    sector: "医薬品",
  },
  {
    code: "8306",
    name: "三菱UFJフィナンシャル・グループ",
    market: "東証プライム",
    sector: "銀行業",
  },
  {
    code: "7974",
    name: "任天堂",
    market: "東証プライム",
    sector: "その他製品",
  },
  {
    code: "9432",
    name: "日本電信電話",
    market: "東証プライム",
    sector: "情報・通信業",
  },
  {
    code: "2914",
    name: "日本たばこ産業",
    market: "東証プライム",
    sector: "食料品",
  },
  {
    code: "8058",
    name: "三菱商事",
    market: "東証プライム",
    sector: "卸売業",
  },
  {
    code: "8411",
    name: "みずほフィナンシャルグループ",
    market: "東証プライム",
    sector: "銀行業",
  },
  {
    code: "4063",
    name: "信越化学工業",
    market: "東証プライム",
    sector: "化学",
  },
  {
    code: "6981",
    name: "村田製作所",
    market: "東証プライム",
    sector: "電気機器",
  },
  {
    code: "4502",
    name: "武田薬品工業",
    market: "東証プライム",
    sector: "医薬品",
  },
  {
    code: "6367",
    name: "ダイキン工業",
    market: "東証プライム",
    sector: "機械",
  },
];

async function main() {
  console.log("日本株データの投入を開始します...");

  for (const stock of japaneseStocks) {
    try {
      const existingStock = await prisma.stock.findUnique({
        where: { code: stock.code },
      });

      if (!existingStock) {
        await prisma.stock.create({
          data: stock,
        });
        console.log(`✓ ${stock.name} (${stock.code}) を追加しました`);
      } else {
        console.log(`- ${stock.name} (${stock.code}) は既に存在します`);
      }
    } catch (error) {
      console.error(`✗ ${stock.name} (${stock.code}) の追加に失敗:`, error);
    }
  }

  console.log("✅ 日本株データの投入が完了しました");
}

main()
  .catch((e) => {
    console.error("シードエラー:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
