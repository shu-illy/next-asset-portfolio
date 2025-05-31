import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// パスワード暗号化のためのキー（実際の運用では環境変数から取得）
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "your-32-character-secret-key-here!!";
const ALGORITHM = "aes-256-cbc";

function encrypt(text: string): string {
  const iv = randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), "utf8");
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

function decrypt(text: string): string {
  const parts = text.split(":");
  const ivHex = parts.shift();
  if (!ivHex) {
    throw new Error("Invalid encrypted text format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const encryptedText = parts.join(":");
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), "utf8");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// SBI証券設定の取得
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

    const sbiSettings = await prisma.sbiSettings.findUnique({
      where: { userId: user.id },
    });

    if (!sbiSettings) {
      return NextResponse.json(null);
    }

    // パスワードは返さない（存在するかどうかのフラグのみ）
    return NextResponse.json({
      id: sbiSettings.id,
      userId: sbiSettings.userId,
      username: sbiSettings.username,
      hasPassword: !!sbiSettings.password,
      createdAt: sbiSettings.createdAt,
      updatedAt: sbiSettings.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching SBI settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// SBI証券設定の保存・更新
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

    const body = (await request.json()) as {
      username: string;
      password: string;
    };
    const { username, password } = body;

    if (!username) {
      return NextResponse.json(
        { error: "ユーザーIDは必須です" },
        { status: 400 }
      );
    }

    const existingSbiSettings = await prisma.sbiSettings.findUnique({
      where: { userId: user.id },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sbiSettings: any;

    if (existingSbiSettings) {
      // 更新
      const updateData: { username: string; password?: string } = { username };

      // パスワードが入力されている場合のみ更新
      if (password) {
        updateData.password = encrypt(password);
      }

      sbiSettings = await prisma.sbiSettings.update({
        where: { userId: user.id },
        data: updateData,
      });
    } else {
      // 新規作成
      if (!password) {
        return NextResponse.json(
          { error: "パスワードは必須です" },
          { status: 400 }
        );
      }

      sbiSettings = await prisma.sbiSettings.create({
        data: {
          userId: user.id,
          username,
          password: encrypt(password),
        },
      });
    }

    // パスワードは返さない
    return NextResponse.json(
      {
        id: sbiSettings.id,
        userId: sbiSettings.userId,
        username: sbiSettings.username,
        hasPassword: !!sbiSettings.password,
        createdAt: sbiSettings.createdAt,
        updatedAt: sbiSettings.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving SBI settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 暗号化・復号化ヘルパー関数をエクスポート（他のAPIで使用）
export { encrypt, decrypt };
