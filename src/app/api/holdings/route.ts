import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

// 保有株式一覧の取得
export async function GET() {
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

    const holdings = await prisma.holding.findMany({
      where: { userId: user.id },
      include: {
        stock: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(holdings);
  } catch (error) {
    console.error("Error fetching holdings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 新しい保有株式の追加
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { stockCode, quantity, averagePrice } = body;

    // 証券コードで株式を検索
    let stock = await prisma.stock.findUnique({
      where: { code: stockCode },
    });

    // 株式が存在しない場合は作成（簡易版）
    if (!stock) {
      stock = await prisma.stock.create({
        data: {
          code: stockCode,
          name: `${stockCode}番銘柄`, // 実際の実装では外部APIから取得
          market: "東証",
          sector: "未分類",
        },
      });
    }

    // 既存の保有があるかチェック
    const existingHolding = await prisma.holding.findUnique({
      where: {
        userId_stockId: {
          userId: user.id,
          stockId: stock.id,
        },
      },
    });

    if (existingHolding) {
      return NextResponse.json({ error: "この銘柄は既に保有しています" }, { status: 400 });
    }

    // 新しい保有を作成
    const holding = await prisma.holding.create({
      data: {
        userId: user.id,
        stockId: stock.id,
        quantity: Number.parseInt(quantity, 10),
        averagePrice: Number.parseFloat(averagePrice),
      },
      include: {
        stock: true,
      },
    });

    return NextResponse.json(holding, { status: 201 });
  } catch (error) {
    console.error("Error creating holding:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
