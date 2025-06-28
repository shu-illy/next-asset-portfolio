"use client";

import { useState, useRef } from "react";

interface ScrapingResults {
  total: number;
  successful: number;
  details: Array<{code: string, success: boolean, error?: string}>;
}

interface CsvUploadProps {
  onUploadSuccess?: (count: number, scrapingResults?: ScrapingResults) => void;
  onUploadError?: (error: string) => void;
}

export default function CsvUpload({
  onUploadSuccess,
  onUploadError,
}: CsvUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      onUploadError?.("CSVファイルを選択してください");
      return;
    }

    uploadCsv(file);
  };

  const uploadCsv = async (file: File) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/portfolio-csv", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        onUploadSuccess?.(data.count, data.scrapingResults);
      } else {
        onUploadError?.(data.error || "アップロードに失敗しました");
      }
    } catch (error) {
      console.error("CSV upload error:", error);
      onUploadError?.("アップロード中にエラーが発生しました");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* CSV形式の説明 */}
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          CSVファイル形式について
        </h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>
            SBI証券の「保有証券一覧」からダウンロードしたCSVファイルをアップロードしてください。
          </p>
          <p className="font-medium">対応フォーマット：</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>現物株式（特定口座）</li>
            <li>現物株式（NISA口座・つみたて投資枠）</li>
            <li>投資信託（特定口座）</li>
            <li>投資信託（NISA口座・成長投資枠）</li>
            <li>投資信託（つみたてNISA口座）</li>
          </ul>
        </div>
      </div>

      {/* ファイルアップロード領域 */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        } ${isUploading ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600">アップロード中...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <p className="text-gray-600">
                CSVファイルをドラッグ&ドロップするか、クリックして選択
              </p>
              <p className="text-sm text-gray-500">
                SBI証券の保有証券一覧CSVファイル（.csv）
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 使用方法の説明 */}
      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="text-sm font-medium text-gray-800 mb-2">
          CSVファイルの取得方法
        </h3>
        <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
          <li>SBI証券の「ポートフォリオ」ページにアクセス</li>
          <li>「保有証券一覧」の「CSVダウンロード」ボタンをクリック</li>
          <li>ダウンロードされたCSVファイルをここにアップロード</li>
        </ol>
      </div>
    </div>
  );
}
