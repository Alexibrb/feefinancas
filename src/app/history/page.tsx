"use client";

import React, { useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { useAppStore, IncomeEntry } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format, parseISO, getMonth, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ArrowRightLeft, Filter, ChevronDown, ChevronUp, Info, TrendingUp, HandCoins, Wallet, Eye, RotateCcw, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function HistoryPage() {
  const { entries, currentUser, isLoaded } = useAppStore();
  const currentYear = new Date().getFullYear().toString();

  // Estados dos Filtros
  const [annualFilterYear, setAnnualFilterYear] = useState(currentYear);
  const [monthlyFilterYear, setMonthlyFilterYear] = useState(currentYear);
  const [recentFilterMonth, setRecentFilterMonth] = useState("all");
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [showAllRecent, setShowAllRecent] = useState(false);

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  // Função para resetar filtros
  const resetFilters = () => {
    setAnnualFilterYear(currentYear);
    setMonthlyFilterYear(currentYear);
    setRecentFilterMonth("all");
    setShowAllRecent(false);
    setExpandedMonth(null);
  };

  const hasActiveFilters = annualFilterYear !== currentYear || 
                          monthlyFilterYear !== currentYear || 
                          recentFilterMonth !== "all" || 
                          showAllRecent;

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    entries.forEach(e => years.add(getYear(parseISO(e.date)).toString()));
    if (years.size === 0) years.add(currentYear);
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [entries, currentYear]);

  const availableMonths = useMemo(() => {
    const monthsMap = new Map<string, string>();
    entries.forEach(e => {
      const d = parseISO(e.date);
      const key = format(d, 'yyyy-MM');
      const label = format(d, 'MMMM yyyy', { locale: ptBR });
      monthsMap.set(key, label);
    });
    return Array.from(monthsMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  const annualSummary = useMemo(() => {
    const years: Record<string, number[]> = {};
    
    entries.forEach(entry => {
      const date = parseISO(entry.date);
      const year = getYear(date).toString();
      const monthIndex = getMonth(date);
      
      if (!years[year]) {
        years[year] = new Array(12).fill(0);
      }
      
      years[year][monthIndex] += (entry.amount * 0.1);
    });

    if (annualFilterYear === "all") {
      const allYearsData = new Array(12).fill(0);
      Object.values(years).forEach(yearData => {
        yearData.forEach((val, idx) => allYearsData[idx] += val);
      });
      return { year: "Todo o Histórico", months: allYearsData, totalYear: allYearsData.reduce((s, v) => s + v, 0) };
    }

    const selectedYearData = years[annualFilterYear] || new Array(12).fill(0);
    const totalYear = selectedYearData.reduce((sum, val) => sum + val, 0);

    return {
      year: annualFilterYear,
      months: selectedYearData,
      totalYear
    };
  }, [entries, annualFilterYear]);

  const groupedEntries = useMemo(() => {
    const groups: Record<string, { 
      month: string, 
      year: string, 
      total: number, 
      tithe: number, 
      count: number,
      items: IncomeEntry[] 
    }> = {};
    
    entries.forEach(entry => {
      const date = parseISO(entry.date);
      const key = format(date, 'yyyy-MM');
      const monthName = format(date, 'MMMM', { locale: ptBR });
      const year = format(date, 'yyyy');
      
      if (!groups[key]) {
        groups[key] = { month: monthName, year, total: 0, tithe: 0, count: 0, items: [] };
      }
      
      groups[key].total += entry.amount;
      groups[key].tithe = groups[key].total * 0.1;
      groups[key].count += 1;
      groups[key].items.push(entry);
    });

    return Object.entries(groups)
      .filter(([, data]) => monthlyFilterYear === "all" || data.year === monthlyFilterYear)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, data]) => ({ 
        key, 
        ...data,
        items: data.items.sort((a, b) => b.date.localeCompare(a.date))
      }));
  }, [entries, monthlyFilterYear]);

  const totalMonthlyTithe = useMemo(() => {
    return groupedEntries.reduce((sum, group) => sum + group.tithe, 0);
  }, [groupedEntries]);

  const totalMonthlyIncome = useMemo(() => {
    return groupedEntries.reduce((sum, group) => sum + group.total, 0);
  }, [groupedEntries]);

  const filteredRecentEntries = useMemo(() => {
    const filtered = [...entries]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter(e => recentFilterMonth === "all" || format(parseISO(e.date), 'yyyy-MM') === recentFilterMonth);
    
    return showAllRecent ? filtered : filtered.slice(0, 5);
  }, [entries, recentFilterMonth, showAllRecent]);

  // Funções para Exportar PDF
  const exportMonthlyPDF = () => {
    const doc = new jsPDF();
    doc.text(`Resumo Mensal - ${monthlyFilterYear === "all" ? "Histórico Completo" : monthlyFilterYear}`, 14, 15);
    doc.text(`Total Entradas: ${currencyFormatter.format(totalMonthlyIncome)}`, 14, 25);
    doc.text(`Total Dízimo: ${currencyFormatter.format(totalMonthlyTithe)}`, 14, 32);
    
    const tableData = groupedEntries.map(g => [
      `${g.month} ${g.year}`,
      g.count.toString(),
      currencyFormatter.format(g.total),
      currencyFormatter.format(g.tithe)
    ]);

    autoTable(doc, {
      head: [['Mês/Ano', 'Lançamentos', 'Total', 'Dízimo']],
      body: tableData,
      startY: 40,
    });

    doc.save(`resumo-mensal-${monthlyFilterYear}.pdf`);
  };

  const exportRecentPDF = () => {
    const doc = new jsPDF();
    doc.text(`Últimos Registros - ${recentFilterMonth === "all" ? "Todos os Meses" : recentFilterMonth}`, 14, 15);
    
    const tableData = filteredRecentEntries.map(e => [
      e.description,
      format(parseISO(e.date), 'dd/MM/yyyy'),
      currencyFormatter.format(e.amount),
      currencyFormatter.format(e.amount * 0.1)
    ]);

    autoTable(doc, {
      head: [['Descrição', 'Data', 'Valor', 'Dízimo']],
      body: tableData,
      startY: 25,
    });

    doc.save(`registros-recentes.pdf`);
  };

  const exportAnnualPDF = () => {
    const doc = new jsPDF();
    doc.text(`Dízimo Anual - ${annualFilterYear === "all" ? "Histórico Completo" : annualFilterYear}`, 14, 15);
    doc.text(`Total Acumulado: ${currencyFormatter.format(annualSummary.totalYear)}`, 14, 25);
    
    const tableData = MONTHS_FULL.map((m, i) => [
      m,
      currencyFormatter.format(annualSummary.months[i])
    ]);

    autoTable(doc, {
      head: [['Mês', 'Dízimo (10%)']],
      body: tableData,
      startY: 35,
    });

    doc.save(`dizimo-anual-${annualFilterYear}.pdf`);
  };

  if (!isLoaded || !currentUser) return null;

  const toggleMonth = (key: string) => {
    setExpandedMonth(expandedMonth === key ? null : key);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-headline font-bold text-primary">Histórico de Mordomia</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Consulte o resumo de entradas e dízimos de meses anteriores.</p>
          </div>
          {hasActiveFilters && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetFilters}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Limpar Filtros
            </Button>
          )}
        </header>

        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Resumo Mensal */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-border/50 h-full overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b bg-muted/20">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="font-headline text-lg sm:text-xl">Resumo Mensal</CardTitle>
                    <Select value={monthlyFilterYear} onValueChange={setMonthlyFilterYear}>
                      <SelectTrigger className="w-[140px] h-9 text-xs">
                        <SelectValue placeholder="Ano" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todo o Histórico</SelectItem>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-primary" onClick={exportMonthlyPDF}>
                      <FileDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    {monthlyFilterYear === "all" ? "Consolidado de todo o período." : `Consolidado do ano ${monthlyFilterYear}.`}
                  </CardDescription>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-border shadow-sm">
                    <Wallet className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider">Entradas</div>
                      <div className="text-lg font-headline font-bold text-foreground">
                        {currencyFormatter.format(totalMonthlyIncome)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-primary/10 px-4 py-3 rounded-lg border border-primary/20 shadow-sm">
                    <HandCoins className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-[10px] uppercase font-bold text-primary/70 tracking-wider">Dízimo</div>
                      <div className="text-lg font-headline font-bold text-primary">
                        {currencyFormatter.format(totalMonthlyTithe)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {groupedEntries.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground px-4">
                    Nenhum registro encontrado para {monthlyFilterYear === "all" ? "o período selecionado" : monthlyFilterYear}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/10">
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Mês/Ano</TableHead>
                          <TableHead className="text-center text-xs sm:text-sm">Lançamentos</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm">Total</TableHead>
                          <TableHead className="text-right text-primary font-bold text-xs sm:text-sm">Dízimo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedEntries.map((group) => (
                          <React.Fragment key={group.key}>
                            <TableRow 
                              className={cn(
                                "hover:bg-muted/50 transition-colors cursor-pointer",
                                expandedMonth === group.key && "bg-muted/30"
                              )}
                              onClick={() => toggleMonth(group.key)}
                            >
                              <TableCell className="capitalize font-medium text-xs sm:text-sm">
                                {group.month} {group.year}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 gap-1.5 text-xs sm:text-sm font-normal"
                                >
                                  <span className="font-bold text-primary">{group.count}</span>
                                  {expandedMonth === group.key ? (
                                    <ChevronUp className="h-3.5 w-3.5 opacity-50" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell className="text-right text-xs sm:text-sm">
                                {currencyFormatter.format(group.total)}
                              </TableCell>
                              <TableCell className="text-right font-headline font-bold text-primary text-xs sm:text-sm">
                                {currencyFormatter.format(group.tithe)}
                              </TableCell>
                            </TableRow>
                            {expandedMonth === group.key && (
                              <TableRow className="bg-muted/10">
                                <TableCell colSpan={4} className="p-0">
                                  <div className="px-4 py-3 border-t border-b border-border/40 animate-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center gap-2 mb-2 text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider">
                                      <Info className="h-3 w-3" />
                                      Detalhes das Entradas de {group.month}
                                    </div>
                                    <div className="space-y-2">
                                      {group.items.map((item) => (
                                        <div 
                                          key={item.id} 
                                          className="flex justify-between items-center p-2 rounded bg-white/80 border border-border/30 text-xs shadow-sm"
                                        >
                                          <div className="flex flex-col">
                                            <span className="font-medium text-primary">{item.description}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                              {format(parseISO(item.date), 'dd/MM/yyyy')}
                                            </span>
                                          </div>
                                          <div className="flex flex-col items-end">
                                            <span className="font-bold">{currencyFormatter.format(item.amount)}</span>
                                            <span className="text-[9px] text-accent font-medium">
                                              Dízimo: {currencyFormatter.format(item.amount * 0.1)}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Últimos Registros */}
          <div className="lg:col-span-1">
            <Card className="shadow-md border-border/50 bg-white/50 h-full">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <CardTitle className="font-headline text-lg">Últimos Registros</CardTitle>
                    <CardDescription className="text-xs">Lançamentos individuais.</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-primary" onClick={exportRecentPDF}>
                    <FileDown className="h-4 w-4" />
                  </Button>
                </div>
                <Select value={recentFilterMonth} onValueChange={(val) => { setRecentFilterMonth(val); setShowAllRecent(false); }}>
                  <SelectTrigger className="w-full h-9 text-xs">
                    <div className="flex items-center gap-2">
                      <Filter className="h-3 w-3 opacity-50" />
                      <SelectValue placeholder="Filtrar por mês" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Meses</SelectItem>
                    {availableMonths.map(([key, label]) => (
                      <SelectItem key={key} value={key} className="capitalize">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {filteredRecentEntries.map((entry) => (
                    <div key={entry.id} className="flex justify-between items-center p-3 rounded-lg bg-white border border-border/40 shadow-sm transition-transform hover:scale-[1.02]">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-primary truncate pr-2">{entry.description}</span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {format(parseISO(entry.date), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <span className="font-bold text-xs sm:text-sm whitespace-nowrap">
                        {currencyFormatter.format(entry.amount)}
                      </span>
                    </div>
                  ))}
                  {filteredRecentEntries.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground text-sm">Nenhum registro encontrado.</p>
                    </div>
                  )}
                </div>
                {!showAllRecent && entries.length > 5 && (
                  <Button 
                    variant="outline" 
                    className="w-full text-xs font-bold gap-2"
                    onClick={() => setShowAllRecent(true)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Exibir Todo o Histórico
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Detalhamento de Dízimo Anual (Vertical) */}
        <Card className="shadow-lg border-border/50 overflow-hidden max-w-2xl mx-auto">
          <CardHeader className="bg-white/50 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              <div>
                <CardTitle className="font-headline text-lg sm:text-xl">
                  {annualFilterYear === "all" ? "Dízimo Consolidado" : `Dízimo Anual ${annualFilterYear}`}
                </CardTitle>
                <CardDescription className="text-xs">Detalhamento por mês</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={annualFilterYear} onValueChange={setAnnualFilterYear}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o Histórico</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-primary" onClick={exportAnnualPDF}>
                <FileDown className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold">Mês</TableHead>
                  <TableHead className="text-right font-bold">Dízimo (10%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MONTHS_FULL.map((monthName, index) => {
                  const tithe = annualSummary.months[index];
                  return (
                    <TableRow key={monthName} className="hover:bg-muted/20">
                      <TableCell className="font-medium text-sm sm:text-base">{monthName}</TableCell>
                      <TableCell className="text-right font-headline text-sm sm:text-base">
                        {tithe > 0 ? (
                          <span className="text-primary font-bold">
                            {currencyFormatter.format(tithe)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground opacity-30">R$ 0,00</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <tfoot className="bg-primary/5 border-t-2">
                <TableRow>
                  <TableCell className="font-headline font-bold text-primary text-base sm:text-lg">
                    {annualFilterYear === "all" ? "Total Histórico" : "Total do Ano"}
                  </TableCell>
                  <TableCell className="text-right font-headline font-bold text-primary text-base sm:text-lg">
                    {currencyFormatter.format(annualSummary.totalYear)}
                  </TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
