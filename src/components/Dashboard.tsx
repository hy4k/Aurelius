import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Transaction, ParseResult, categorizeTransactions } from "@/services/geminiService";
import { ArrowDownRight, ArrowUpRight, AlertTriangle, Building2, User, ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DashboardProps {
  data: ParseResult;
  onUpdateData: (data: ParseResult) => void;
}

const COLORS = [
  "#0f172a", // slate-900
  "#475569", // slate-600
  "#b89768", // gold
  "#94a3b8", // slate-400
  "#cbd5e1", // slate-300
  "#e2e8f0", // slate-200
  "#1e293b", // slate-800
  "#334155", // slate-700
];

export function Dashboard({ data, onUpdateData }: DashboardProps) {
  const [mode, setMode] = useState<"personal" | "business">("personal");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction; direction: "asc" | "desc" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [isCategorizing, setIsCategorizing] = useState(false);

  const handleRecategorize = async () => {
    setIsCategorizing(true);
    try {
      const descriptions = processedTransactions.map(t => t.description);
      if (descriptions.length === 0) return;
      
      const newCategories = await categorizeTransactions(descriptions);
      
      const updatedTransactions = data.transactions.map(t => {
        const index = processedTransactions.findIndex(pt => pt.id === t.id);
        if (index !== -1 && newCategories[index]) {
          return { ...t, category: newCategories[index] };
        }
        return t;
      });

      onUpdateData({ ...data, transactions: updatedTransactions });
    } catch (error) {
      console.error("Recategorization failed:", error);
    } finally {
      setIsCategorizing(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return data.transactions.filter((t) =>
      mode === "business" ? t.isBusiness : !t.isBusiness
    );
  }, [data.transactions, mode]);

  const categories = useMemo(() => {
    const cats = new Set(filteredTransactions.map(t => t.category));
    return Array.from(cats).sort();
  }, [filteredTransactions]);

  const processedTransactions = useMemo(() => {
    let result = [...filteredTransactions];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => t.description.toLowerCase().includes(query));
    }
    if (filterCategory !== "all") {
      result = result.filter(t => t.category === filterCategory);
    }
    if (filterType !== "all") {
      result = result.filter(t => t.type === filterType);
    }

    if (sortConfig) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    } else {
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return result;
  }, [filteredTransactions, searchQuery, filterCategory, filterType, sortConfig]);

  const requestSort = (key: keyof Transaction) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getCategoryColor = (category: string) => {
    const index = categories.indexOf(category);
    const color = index === -1 ? COLORS[0] : COLORS[index % COLORS.length];
    
    // Simple contrast check: if color is light (high index in our specific COLORS array), use dark text
    // Our COLORS array: 0, 1, 6, 7 are dark. 2, 3 are medium. 4, 5 are light.
    const colorIndex = index === -1 ? 0 : index % COLORS.length;
    const isLight = [4, 5].includes(colorIndex);
    
    return {
      backgroundColor: color,
      color: isLight ? "#0f172a" : "#ffffff",
      borderColor: "transparent"
    };
  };

  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryMap: Record<string, number> = {};
    const monthlyData: Record<string, { income: number; expense: number }> = {};

    filteredTransactions.forEach((t) => {
      const amount = t.amount;
      const month = format(parseISO(t.date), "MMM yyyy");

      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expense: 0 };
      }

      if (t.type === "credit") {
        totalIncome += amount;
        monthlyData[month].income += amount;
      } else {
        totalExpense += amount;
        monthlyData[month].expense += amount;
        categoryMap[t.category] = (categoryMap[t.category] || 0) + amount;
      }
    });

    const savingsRatio =
      totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    const burnRate = totalExpense; // Simplified burn rate for now

    const categoryData = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categories

    const trendData = Object.entries(monthlyData)
      .map(([month, values]) => ({ month, ...values }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    return {
      totalIncome,
      totalExpense,
      savingsRatio,
      burnRate,
      categoryData,
      trendData,
    };
  }, [filteredTransactions]);

  const anomalies = useMemo(() => {
    return filteredTransactions.filter((t) => t.anomaly);
  }, [filteredTransactions]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-serif font-light tracking-tight text-slate-900">
            Wealth Dashboard
          </h2>
          <p className="text-slate-500 font-light mt-1">
            {data.bankName} • Account ending in {data.accountNumber}
          </p>
        </div>
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "personal" | "business")}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" /> Personal
            </TabsTrigger>
            <TabsTrigger value="business" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Business
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs uppercase tracking-widest font-semibold text-slate-500">Total Inflow</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif text-slate-900">
              {data.currency} {stats.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs uppercase tracking-widest font-semibold text-slate-500">Total Outflow</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif text-slate-900">
              {data.currency} {stats.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs uppercase tracking-widest font-semibold text-slate-500">
              {mode === "personal" ? "Savings Ratio" : "Net Profit Margin"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif text-slate-900">
              {stats.savingsRatio.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-400 mt-1 font-light">
              {stats.savingsRatio > 20 ? "Optimal" : "Requires Attention"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs uppercase tracking-widest font-semibold text-slate-500">
              {mode === "personal" ? "Monthly Burn" : "Burn Rate"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif text-slate-900">
              {data.currency} {stats.burnRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Income vs Expense Trend</CardTitle>
            <CardDescription>Monthly cash flow analysis</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis
                    dataKey="month"
                    stroke="#71717a"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    cursor={{ fill: "#f4f4f5" }}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e4e4e7" }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Inflow" fill="#0f172a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="expense" name="Outflow" fill="#b89768" radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>Top spending categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e4e4e7" }}
                    formatter={(value: number) => [`${data.currency} ${value.toFixed(2)}`, "Amount"]}
                  />
                  <Legend layout="vertical" verticalAlign="middle" align="right" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <Card className="border-stone-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <AlertTriangle className="h-5 w-5 text-slate-400" />
              Transactions Requiring Review
            </CardTitle>
            <CardDescription className="text-slate-500">
              Proprietary models flagged these items for your attention.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {anomalies.map((t) => (
                <div key={t.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-none border border-stone-200">
                  <div>
                    <div className="font-medium text-slate-900">{t.description}</div>
                    <div className="text-sm text-slate-600 mt-1 font-light">{t.anomaly}</div>
                    <div className="text-xs text-slate-400 mt-2 uppercase tracking-wider">{format(parseISO(t.date), "MMM dd, yyyy")}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-serif text-lg text-slate-900">
                      {data.currency} {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <Badge 
                      variant="outline" 
                      className="mt-2 text-[10px]"
                      style={getCategoryColor(t.category)}
                    >
                      {t.category}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card className="border-stone-200 bg-white shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-slate-900">Transaction Ledger</CardTitle>
              <CardDescription className="text-slate-500">
                Showing {processedTransactions.length} {mode} transactions
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 ml-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full sm:w-48 pl-9 pr-4 text-sm border border-stone-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all rounded-none font-sans"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 ml-1">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="h-10 px-3 text-sm border border-stone-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all rounded-none font-sans"
                >
                  <option value="all">All Categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 ml-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="h-10 px-3 text-sm border border-stone-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all rounded-none font-sans"
                >
                  <option value="all">All Types</option>
                  <option value="credit">Inflow (Credit)</option>
                  <option value="debit">Outflow (Debit)</option>
                </select>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRecategorize} 
                disabled={isCategorizing || processedTransactions.length === 0}
                className="h-10 gap-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
              >
                {isCategorizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                AI Categorize
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('date')}>
                  <div className="flex items-center gap-2">
                    Date
                    {sortConfig?.key === 'date' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('description')}>
                  <div className="flex items-center gap-2">
                    Description
                    {sortConfig?.key === 'description' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('category')}>
                  <div className="flex items-center gap-2">
                    Category
                    {sortConfig?.key === 'category' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('type')}>
                  <div className="flex items-center gap-2">
                    Type
                    {sortConfig?.key === 'type' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors text-right" onClick={() => requestSort('amount')}>
                  <div className="flex items-center justify-end gap-2">
                    Amount
                    {sortConfig?.key === 'amount' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedTransactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-slate-500 whitespace-nowrap">
                    {format(parseISO(t.date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900">{t.description}</div>
                    {t.anomaly && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-slate-500 mt-1">
                        <AlertTriangle className="h-3 w-3" /> Flagged
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className="font-semibold"
                      style={getCategoryColor(t.category)}
                    >
                      {t.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-[10px] font-semibold uppercase tracking-widest", t.type === "credit" ? "text-slate-900" : "text-slate-500")}>
                      {t.type === "credit" ? "Credit" : "Debit"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "font-serif text-lg whitespace-nowrap",
                        t.type === "credit" ? "text-slate-900" : "text-slate-500"
                      )}
                    >
                      {t.type === "credit" ? "+" : "-"}
                      {data.currency} {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {processedTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                    No transactions match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
