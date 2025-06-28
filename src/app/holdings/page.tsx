import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Navigation } from "@/components/layout/Navigation";
import { HoldingsClient } from "./HoldingsClient";

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
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">保有株式</h1>
          <p className="text-gray-600">あなたが保有している株式の一覧と管理</p>
        </div>

        <HoldingsClient />
      </div>
    </div>
  );
}
