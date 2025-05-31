import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TOTPシークレット生成
    const secret = speakeasy.generateSecret({
      name: `SBI証券 (${session.user.email})`,
      issuer: "Next Asset Portfolio",
      length: 32,
    });

    // QRコード生成
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || "");

    return NextResponse.json({
      success: true,
      secret: secret.base32,
      qrCodeUrl,
      message: "TOTP設定用のQRコードを生成しました",
    });
  } catch (error) {
    console.error("TOTP生成エラー:", error);
    return NextResponse.json(
      { error: "TOTP生成でエラーが発生しました" },
      { status: 500 }
    );
  }
}
