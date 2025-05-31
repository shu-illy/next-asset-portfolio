"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  DollarSign,
  Wallet,
  BarChart3,
  PieChart,
} from "lucide-react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // サンプルデータ（後でAPIから取得）
  const portfolioData = {
    totalValue: 2450000,
    totalGain: 125000,
    gainPercentage: 5.4,
    dividendIncome: 48000,
    dividendYield: 1.96,
    holdingsCount: 12,
  };

  const recentDividends = [
    { id: "div1", stock: "トヨタ自動車", amount: 12000, date: "2024-03-15" },
    { id: "div2", stock: "三菱UFJ", amount: 8500, date: "2024-03-10" },
    { id: "div3", stock: "NTT", amount: 15000, date: "2024-03-05" },
  ];

  const topHoldings = [
    { id: "hold1", stock: "トヨタ自動車", value: 450000, percentage: 18.4 },
    { id: "hold2", stock: "三菱UFJ", value: 320000, percentage: 13.1 },
    { id: "hold3", stock: "NTT", value: 280000, percentage: 11.4 },
    { id: "hold4", stock: "ソフトバンク", value: 250000, percentage: 10.2 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600 mt-2">
            ようこそ、{session.user?.name}さん
          </p>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総資産額</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{portfolioData.totalValue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">前日比 +¥25,000</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">評価損益</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +¥{portfolioData.totalGain.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +{portfolioData.gainPercentage}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                年間配当収入
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{portfolioData.dividendIncome.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                利回り {portfolioData.dividendYield}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">保有銘柄数</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {portfolioData.holdingsCount}銘柄
              </div>
              <p className="text-xs text-muted-foreground">分散投資中</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 最近の配当金 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>最近の配当金</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentDividends.map((dividend) => (
                  <div
                    key={dividend.id}
                    className="flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{dividend.stock}</p>
                      <p className="text-sm text-gray-500">{dividend.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">
                        +¥{dividend.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 主要保有銘柄 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>主要保有銘柄</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topHoldings.map((holding) => (
                  <div key={holding.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="font-medium">{holding.stock}</p>
                      <p className="text-sm text-gray-500">
                        {holding.percentage}%
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-4">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${holding.percentage}%` }}
                        />
                      </div>
                      <p className="text-sm font-medium">
                        ¥{holding.value.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* クイックアクション */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>クイックアクション</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <h3 className="font-medium mb-2">新規取引を追加</h3>
                  <p className="text-sm text-gray-600">株式の売買履歴を記録</p>
                </button>
                <button
                  type="button"
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <h3 className="font-medium mb-2">配当金を記録</h3>
                  <p className="text-sm text-gray-600">
                    受け取った配当金を追加
                  </p>
                </button>
                <button
                  type="button"
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <h3 className="font-medium mb-2">データを同期</h3>
                  <p className="text-sm text-gray-600">SBI証券からデータ取得</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
