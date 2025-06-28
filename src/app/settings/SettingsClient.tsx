"use client";

import { useState } from "react";
import CsvUpload from "@/components/CsvUpload";

interface ScrapingResults {
  total: number;
  successful: number;
  details: Array<{code: string, success: boolean, error?: string}>;
}

export default function SettingsClient() {
  const [message, setMessage] = useState("");

  const handleCsvUploadSuccess = (count: number, scrapingResults?: ScrapingResults) => {
    let successMessage = `✅ CSVアップロード成功: ${count}件のポートフォリオデータを取得しました`;
    
    if (scrapingResults && scrapingResults.total > 0) {
      successMessage += `\n📡 ${scrapingResults.successful}/${scrapingResults.total}件の銘柄情報を自動取得しました`;
      
      if (scrapingResults.successful < scrapingResults.total) {
        const failedItems = scrapingResults.details
          .filter(r => !r.success)
          .map(r => `${r.code}: ${r.error || '不明なエラー'}`)
          .join('\n');
        successMessage += `\n⚠️ 取得失敗:\n${failedItems}`;
      }
    }
    
    setMessage(successMessage);
  };

  const handleCsvUploadError = (error: string) => {
    setMessage(`❌ CSVアップロードエラー: ${error}`);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">ポートフォリオ管理</h1>

      {/* CSV アップロード機能 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">保有証券データの取り込み</h2>

        <CsvUpload
          onUploadSuccess={handleCsvUploadSuccess}
          onUploadError={handleCsvUploadError}
        />
      </div>

      {/* メッセージ表示 */}
      {message && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <p className="text-sm whitespace-pre-line">{message}</p>
        </div>
      )}
    </div>
  );
}
