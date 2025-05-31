"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import {
  BarChart3,
  TrendingUp,
  Wallet,
  Shield,
  Smartphone,
  Globe,
} from "lucide-react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

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

  if (session) {
    return null; // リダイレクト中
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ヒーローセクション */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              配当金管理を
              <br />
              もっとスマートに
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              株式投資の配当金を効率的に追跡・分析し、
              <br />
              投資戦略の最適化をサポートします
            </p>
            <Button
              size="lg"
              onClick={() => signIn("google")}
              className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3"
            >
              無料で始める
            </Button>
          </div>
        </div>
      </section>

      {/* 機能紹介セクション */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              主な機能
            </h2>
            <p className="text-xl text-gray-600">
              投資家のための包括的な配当金管理ツール
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">リアルタイム分析</h3>
              <p className="text-gray-600">
                保有株式の配当利回りや収益性を リアルタイムで分析・可視化
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">配当予測</h3>
              <p className="text-gray-600">
                過去のデータを基に将来の 配当収入を予測・計画
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Wallet className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">ポートフォリオ管理</h3>
              <p className="text-gray-600">
                保有株式の一元管理と セクター分散の最適化
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 特徴セクション */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                なぜ選ばれるのか
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <Shield className="h-6 w-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">セキュアな環境</h3>
                    <p className="text-gray-600">
                      銀行レベルのセキュリティで大切な投資データを保護
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Smartphone className="h-6 w-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">モバイル対応</h3>
                    <p className="text-gray-600">
                      スマートフォンからいつでもどこでもアクセス可能
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Globe className="h-6 w-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">自動データ取得</h3>
                    <p className="text-gray-600">
                      SBI証券と連携して保有株式データを自動取得
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  今すぐ始めよう
                </h3>
                <p className="text-gray-600 mb-6">
                  Googleアカウントで簡単ログイン
                  <br />
                  数分で配当金管理を開始できます
                </p>
                <Button
                  onClick={() => signIn("google")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  無料でアカウント作成
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-4">配当金管理アプリ</h3>
            <p className="text-gray-400">
              © 2024 配当金管理アプリ. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
