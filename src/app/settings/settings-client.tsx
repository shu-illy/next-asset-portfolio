"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Eye,
  EyeOff,
  Download,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

interface SbiSettings {
  id: string;
  userId: string;
  username: string;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export function SettingsClient() {
  const { data: session } = useSession();
  const [sbiSettings, setSbiSettings] = useState<SbiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // フォームの状態
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  useEffect(() => {
    if (session?.user) {
      fetchSbiSettings();
    }
  }, [session]);

  const fetchSbiSettings = async () => {
    try {
      const response = await fetch("/api/settings/sbi");
      if (response.ok) {
        const data = await response.json();
        setSbiSettings(data);
        if (data) {
          setFormData({ username: data.username, password: "" });
        }
      }
    } catch (error) {
      console.error("Failed to fetch SBI settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/settings/sbi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setSbiSettings(data);
        alert("SBI証券設定を保存しました");
        setFormData({ ...formData, password: "" }); // パスワードフィールドをクリア
      } else {
        const error = await response.json();
        alert(error.error || "保存に失敗しました");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!sbiSettings) {
      alert("先にSBI証券の設定を保存してください");
      return;
    }

    setTesting(true);
    try {
      const response = await fetch("/api/scraping/test", {
        method: "POST",
      });

      if (response.ok) {
        alert("SBI証券への接続テストが成功しました！");
      } else {
        const error = await response.json();
        alert(`接続テストに失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to test connection:", error);
      alert("接続テストに失敗しました");
    } finally {
      setTesting(false);
    }
  };

  const handleScrapeData = async () => {
    if (!sbiSettings) {
      alert("先にSBI証券の設定を保存してください");
      return;
    }

    setTesting(true);
    try {
      const response = await fetch("/api/scraping/portfolio", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        alert(
          `ポートフォリオデータを取得しました！${data.count}件の保有株式を更新`
        );
      } else {
        const error = await response.json();
        alert(`データ取得に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to scrape data:", error);
      alert("データ取得に失敗しました");
    } finally {
      setTesting(false);
    }
  };

  const handleMockData = async () => {
    setTesting(true);
    try {
      const response = await fetch("/api/scraping/mock", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        alert(
          `モックデータでポートフォリオを更新しました！${data.count}件の保有株式を追加`
        );
      } else {
        const error = await response.json();
        alert(`モックデータ更新に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to update mock data:", error);
      alert("モックデータ更新に失敗しました");
    } finally {
      setTesting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SBI証券設定 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle>SBI証券連携設定</CardTitle>
              <CardDescription>
                SBI証券のログイン情報を設定して、自動でポートフォリオデータを取得します
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 警告メッセージ */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 mb-1">
                  セキュリティについて
                </p>
                <p className="text-yellow-700">
                  ログイン情報は暗号化してデータベースに保存されます。
                  二段階認証が有効な場合は、アプリパスワードを使用してください。
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium mb-1"
              >
                ユーザーID
              </label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="SBI証券のユーザーID"
                value={formData.username}
                onChange={handleInputChange}
                required
                className="w-full p-3 border rounded-md"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1"
              >
                パスワード
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={
                    sbiSettings?.hasPassword
                      ? "変更する場合のみ入力"
                      : "SBI証券のパスワード"
                  }
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!sbiSettings?.hasPassword}
                  className="w-full p-3 border rounded-md pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "保存中..." : "設定を保存"}
            </Button>
          </form>

          {/* 現在の設定状況 */}
          {sbiSettings && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ SBI証券の設定が完了しています (ユーザーID:{" "}
                {sbiSettings.username})
              </p>
              <p className="text-xs text-green-600 mt-1">
                最終更新:{" "}
                {new Date(sbiSettings.updatedAt).toLocaleString("ja-JP")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* スクレイピング操作 */}
      {sbiSettings && (
        <Card>
          <CardHeader>
            <CardTitle>データ取得操作</CardTitle>
            <CardDescription>
              SBI証券からポートフォリオデータを取得します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <Button
                onClick={handleTestConnection}
                variant="outline"
                disabled={testing}
                className="flex items-center gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${testing ? "animate-spin" : ""}`}
                />
                {testing ? "接続テスト中..." : "接続テスト"}
              </Button>

              <Button
                onClick={handleScrapeData}
                disabled={testing}
                className="flex items-center gap-2"
              >
                <Download
                  className={`h-4 w-4 ${testing ? "animate-spin" : ""}`}
                />
                {testing ? "データ取得中..." : "ポートフォリオデータを取得"}
              </Button>

              <Button
                onClick={handleMockData}
                disabled={testing}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Download
                  className={`h-4 w-4 ${testing ? "animate-spin" : ""}`}
                />
                {testing ? "モック更新中..." : "モックデータでテスト"}
              </Button>
            </div>

            <div className="text-sm text-gray-600 mt-4">
              <p>
                • 接続テスト: SBI証券へのログインが正常にできるかテストします
              </p>
              <p>
                • データ取得:
                実際に保有株式のデータを取得してデータベースを更新します
              </p>
              <p>
                • モックデータ:
                テスト用のサンプルデータでポートフォリオ機能を確認します
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
