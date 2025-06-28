"use client";

import { Edit, Plus, Trash2, TrendingUp } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Stock {
  id: string;
  code: string;
  name: string;
  market: string;
  sector?: string;
}

interface Holding {
  id: string;
  userId: string;
  stockId: string;
  quantity: number;
  averagePrice: number;
  stock: Stock;
}

export function HoldingsClient() {
  const { data: session } = useSession();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // フォームの状態
  const [formData, setFormData] = useState({
    stockCode: "",
    quantity: "",
    averagePrice: "",
  });

  const fetchHoldings = useCallback(async () => {
    try {
      const response = await fetch("/api/holdings");
      if (response.ok) {
        const data = await response.json();
        setHoldings(data);
      }
    } catch (error) {
      console.error("Failed to fetch holdings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchHoldings();
    }
  }, [session, fetchHoldings]);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/holdings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newHolding = await response.json();
        setHoldings([newHolding, ...holdings]);
        setShowAddForm(false);
        setFormData({ stockCode: "", quantity: "", averagePrice: "" });
      } else {
        const error = await response.json();
        alert(error.error || "追加に失敗しました");
      }
    } catch (error) {
      console.error("Failed to add holding:", error);
      alert("追加に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={`skeleton-${Date.now()}-${i}`} className="h-24 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">保有銘柄 ({holdings.length}銘柄)</h2>
          <p className="text-sm text-gray-600">
            総評価額: ¥
            {holdings
              .reduce((sum, holding) => sum + holding.quantity * holding.averagePrice, 0)
              .toLocaleString()}
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          株式を追加
        </Button>
      </div>

      {/* 保有株式一覧 */}
      {holdings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">保有株式がありません</h3>
            <p className="text-gray-600 mb-4">
              最初の株式を追加して、ポートフォリオの管理を始めましょう
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              株式を追加
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {holdings.map((holding) => (
            <Card key={holding.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{holding.stock.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <span className="font-mono">{holding.stock.code}</span>
                      <span>•</span>
                      <span>{holding.stock.market}</span>
                      {holding.stock.sector && (
                        <>
                          <span>•</span>
                          <span>{holding.stock.sector}</span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">保有数量</p>
                    <p className="font-semibold">{holding.quantity.toLocaleString()}株</p>
                  </div>
                  <div>
                    <p className="text-gray-600">平均取得価格</p>
                    <p className="font-semibold">¥{holding.averagePrice.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">評価額</p>
                    <p className="font-semibold">
                      ¥{(holding.quantity * holding.averagePrice).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 追加フォーム（モーダル） */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>新しい株式を追加</CardTitle>
              <CardDescription>保有している株式の情報を入力してください</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddStock} className="space-y-4">
                <div>
                  <label htmlFor="stockCode" className="block text-sm font-medium mb-1">
                    証券コード
                  </label>
                  <input
                    id="stockCode"
                    name="stockCode"
                    type="text"
                    placeholder="例: 7203"
                    value={formData.stockCode}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium mb-1">
                    保有数量
                  </label>
                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    placeholder="例: 100"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                    min="1"
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="averagePrice" className="block text-sm font-medium mb-1">
                    平均取得価格
                  </label>
                  <input
                    id="averagePrice"
                    name="averagePrice"
                    type="number"
                    placeholder="例: 2500"
                    value={formData.averagePrice}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting ? "追加中..." : "追加"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowAddForm(false);
                      setFormData({
                        stockCode: "",
                        quantity: "",
                        averagePrice: "",
                      });
                    }}
                    disabled={submitting}
                  >
                    キャンセル
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
