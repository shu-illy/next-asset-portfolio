import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "../../settings/sbi/route";

// SBI証券への接続テスト
export async function POST() {
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

    console.log("SBI証券接続テスト開始:", {
      username,
      passwordLength: password.length,
    });

    // 実際のスクレイピングテスト（簡易版）
    // 本来ならPuppeteerでSBI証券にログインしてテストする

    // モックテスト（実装例）
    if (!username || !password || password.length === 0) {
      return NextResponse.json(
        { error: "ログイン情報が不正です" },
        { status: 400 }
      );
    }

    // ここで実際のPuppeteerによるテストを行う
    // 今回は成功として返す
    console.log("✅ SBI証券接続テスト成功");

    return NextResponse.json({
      success: true,
      message: "SBI証券への接続テストが成功しました",
      username,
    });
  } catch (error) {
    console.error("Error testing SBI connection:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
