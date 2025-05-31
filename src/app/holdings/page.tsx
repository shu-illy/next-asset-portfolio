import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { HoldingsClient } from "./holdings-client";

export const metadata: Metadata = {
  title: "保有株式 | 配当金管理アプリ",
  description: "保有している株式の一覧と管理",
};

export default async function HoldingsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">保有株式</h1>
          <p className="text-gray-600">あなたが保有している株式の一覧と管理</p>
        </div>

        <HoldingsClient />
      </div>
    </div>
  );
}
