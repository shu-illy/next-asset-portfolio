"use client";

import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* ロゴ */}
          <Link href="/" className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">配当管理</span>
          </Link>

          {/* ナビゲーションメニュー */}
          <div className="flex items-center space-x-4">
            {session ? (
              <Link href="/dashboard">
                <Button variant="outline">ダッシュボードへ</Button>
              </Link>
            ) : (
              <Button onClick={() => signIn("google")}>ログイン</Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
