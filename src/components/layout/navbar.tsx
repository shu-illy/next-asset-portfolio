"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  Wallet,
  Settings,
  LogOut,
  User,
} from "lucide-react";

export default function Navbar() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">
                配当金管理
              </span>
            </div>
            <div className="flex items-center">
              <div className="animate-pulse bg-gray-200 h-8 w-20 rounded" />
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-gray-900">
              配当金管理
            </Link>

            {session && (
              <div className="hidden md:flex space-x-6">
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>ダッシュボード</span>
                </Link>
                <Link
                  href="/holdings"
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
                >
                  <Wallet className="h-4 w-4" />
                  <span>保有株式</span>
                </Link>
                <Link
                  href="/dividends"
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>配当履歴</span>
                </Link>
                <Link
                  href="/analytics"
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>分析</span>
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {session ? (
              <>
                <Link
                  href="/settings"
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:block">設定</span>
                </Link>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-700 hidden sm:block">
                    {session.user?.name}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut()}
                  className="flex items-center space-x-1"
                >
                  <LogOut className="h-4 w-4" />
                  <span>ログアウト</span>
                </Button>
              </>
            ) : (
              <Button
                onClick={() => signIn("google")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                ログイン
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
