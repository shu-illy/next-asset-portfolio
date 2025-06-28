"use client";

import {
  BarChart3,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  TrendingUp,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard },
  { name: "保有株式", href: "/holdings", icon: TrendingUp },
  { name: "配当履歴", href: "/dividends", icon: DollarSign },
  { name: "分析", href: "/analytics", icon: BarChart3 },
  { name: "設定", href: "/settings", icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!session) return null;

  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* ロゴ */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">配当管理</span>
          </Link>

          {/* デスクトップメニュー */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* ユーザーメニュー */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {session.user?.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name || ""}
                  className="h-8 w-8 rounded-full"
                  width={32}
                  height={32}
                />
              )}
              <span className="text-sm text-gray-700">{session.user?.name}</span>
            </div>

            <Button
              onClick={() => signOut()}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>ログアウト</span>
            </Button>
          </div>

          {/* モバイルメニューボタン */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-50"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* モバイルメニュー */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium ${
                      isActive
                        ? "text-blue-600 bg-blue-50"
                        : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-5 space-x-3">
                {session.user?.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || ""}
                    className="h-10 w-10 rounded-full"
                    width={40}
                    height={40}
                  />
                )}
                <div>
                  <div className="text-base font-medium text-gray-800">{session.user?.name}</div>
                  <div className="text-sm text-gray-500">{session.user?.email}</div>
                </div>
              </div>
              <div className="mt-3 px-2">
                <Button
                  onClick={() => signOut()}
                  variant="outline"
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>ログアウト</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
