import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Navigation } from "@/components/Navigation";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = {
  title: "設定 | 配当金管理アプリ",
  description: "SBI証券連携やその他の設定を管理",
};

export default async function SettingsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">設定</h1>
          <p className="text-gray-600">SBI証券連携やアプリケーションの設定を管理</p>
        </div>

        <SettingsClient />
      </div>
    </div>
  );
}
