"use client";

import { useState, useEffect } from "react";

export default function SettingsClient() {
  const [sbiSettings, setSbiSettings] = useState({
    username: "",
    password: "",
    totpSecret: "", // 2段階認証用
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showTotpSecret, setShowTotpSecret] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 設定を読み込み
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings/sbi");
        if (response.ok) {
          const data = await response.json();
          setSbiSettings({
            username: data.username || "",
            password: data.password || "",
            totpSecret: data.totpSecret || "",
          });
        }
      } catch (error) {
        console.error("設定読み込みエラー:", error);
      }
    };

    loadSettings();
  }, []);

  // TOTPシークレット生成
  const generateTotpSecret = async () => {
    try {
      const response = await fetch("/api/settings/sbi/generate-totp", {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setSbiSettings((prev) => ({ ...prev, totpSecret: data.secret }));
        setQrCodeUrl(data.qrCodeUrl);
        setMessage(
          "新しい認証キーを生成しました。認証アプリでQRコードをスキャンしてください。"
        );
      }
    } catch (error) {
      console.error("TOTP生成エラー:", error);
      setMessage("認証キー生成に失敗しました");
    }
  };

  // 設定を保存
  const handleSave = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/settings/sbi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sbiSettings),
      });

      if (response.ok) {
        setMessage("設定を保存しました");
      } else {
        setMessage("保存に失敗しました");
      }
    } catch (error) {
      console.error("保存エラー:", error);
      setMessage("保存エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // 接続テスト
  const testConnection = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/scraping/test", {
        method: "POST",
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(`接続テスト成功: ${data.message}`);
      } else {
        setMessage(`接続テストエラー: ${data.error}`);
      }
    } catch (error) {
      console.error("接続テストエラー:", error);
      setMessage("接続テストでエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // 実際のスクレイピング
  const runScraping = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/scraping/portfolio", {
        method: "POST",
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(`スクレイピング成功: ${data.count}件のデータを取得しました`);
      } else {
        setMessage(`スクレイピングエラー: ${data.error}`);
      }
    } catch (error) {
      console.error("スクレイピングエラー:", error);
      setMessage("スクレイピングでエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // モックデータテスト
  const testMockData = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/scraping/mock", {
        method: "POST",
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(
          `モックデータテスト成功: ${data.count}件のデータを保存しました`
        );
      } else {
        setMessage(`モックデータテストエラー: ${data.error}`);
      }
    } catch (error) {
      console.error("モックデータテストエラー:", error);
      setMessage("モックデータテストでエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">設定</h1>

      {/* SBI証券設定 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">SBI証券設定</h2>

        <div className="space-y-4">
          {/* ユーザー名 */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              ユーザー名
            </label>
            <input
              id="username"
              type="text"
              value={sbiSettings.username}
              onChange={(e) =>
                setSbiSettings({ ...sbiSettings, username: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* パスワード */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              パスワード
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={sbiSettings.password}
                onChange={(e) =>
                  setSbiSettings({ ...sbiSettings, password: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
              >
                {showPassword ? "隠す" : "表示"}
              </button>
            </div>
          </div>

          {/* 2段階認証設定 */}
          <div>
            <label
              htmlFor="totpSecret"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              2段階認証キー
            </label>
            <div className="space-y-2">
              <div className="relative">
                <input
                  id="totpSecret"
                  type={showTotpSecret ? "text" : "password"}
                  value={sbiSettings.totpSecret}
                  onChange={(e) =>
                    setSbiSettings({
                      ...sbiSettings,
                      totpSecret: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="認証アプリのシークレットキー"
                />
                <button
                  type="button"
                  onClick={() => setShowTotpSecret(!showTotpSecret)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                >
                  {showTotpSecret ? "隠す" : "表示"}
                </button>
              </div>
              <button
                type="button"
                onClick={generateTotpSecret}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                disabled={isLoading}
              >
                新しいキーを生成
              </button>
              <p className="text-sm text-gray-600">
                SBI証券の2段階認証設定で表示されるQRコードから、シークレットキーを入力してください。
                または「新しいキーを生成」でテスト用キーを作成できます。
              </p>
            </div>
          </div>

          {/* QRコード表示 */}
          {qrCodeUrl && (
            <div>
              <div className="block text-sm font-medium text-gray-700 mb-2">
                認証アプリ設定用QRコード
              </div>
              <img src={qrCodeUrl} alt="QR Code" className="border rounded" />
              <p className="text-sm text-gray-600 mt-2">
                Google
                Authenticator等の認証アプリでこのQRコードをスキャンしてください。
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? "保存中..." : "設定を保存"}
        </button>
      </div>

      {/* スクレイピング機能 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">スクレイピング機能</h2>

        <div className="space-y-4">
          <button
            type="button"
            onClick={testConnection}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isLoading ? "実行中..." : "接続テスト"}
          </button>

          <button
            type="button"
            onClick={runScraping}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? "実行中..." : "実際のスクレイピング"}
          </button>

          <button
            type="button"
            onClick={testMockData}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            {isLoading ? "実行中..." : "モックデータテスト"}
          </button>
        </div>
      </div>

      {/* メッセージ表示 */}
      {message && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <p className="text-sm">{message}</p>
        </div>
      )}
    </div>
  );
}
