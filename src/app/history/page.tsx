
"use client";

import { useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, getMonth, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ArrowRightLeft, Filter } from "lucide-react";

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function HistoryPage() {
  const { entries, currentUser, isLoaded } = useAppStore();
  const currentYear = new Date().getFullYear().toString();

  // Estados dos Filtros
  const [annualFilterYear, setAnnualFilterYear] = useState(currentYear);
  const [monthlyFilterYear, setMonthlyFilterYear] = useState(currentYear);
  const [recentFilterMonth, setRecentFilterMonth] = useState("all");

  // Opções para os Selects baseadas nos dados existentes
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

    return Object.entries(years)
      .filter(([year]) => year === annualFilterYear)
      .map(([year, months]) => ({
        year,
        months,
        totalYear: months.reduce((sum, val) => sum + val, 0)
      }));
  }, [entries, annualFilterYear]);

  const groupedEntries = useMemo(() => {
    const groups: Record<string, { month: string, year: string, total: number, tithe: number, count: number }> = {};
    
    entries.forEach(entry => {
      const date = parseISO(entry.date);
      const key = format(date, 'yyyy-MM');
      const monthName = format(date, 'MMMM', { locale: ptBR });
      const year = format(date, 'yyyy');
      
      if (!groups[key]) {
        groups[key] = { month: monthName, year, total: 0, tithe: 0, count: 0 };
      }
      
      groups[key].total += entry.amount;
      groups[key].tithe = groups[key].total * 0.1;
      groups[key].count += 1;
    });

    return Object.entries(groups)
      .filter(([, data]) => data.year === monthlyFilterYear)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, data]) => ({ key, ...data }));
  }, [entries, monthlyFilterYear]);

  const filteredRecentEntries = useMemo(() => {
    return entries
      .filter(e => recentFilterMonth === "all" || format(parseISO(e.date), 'yyyy-MM') === recentFilterMonth)
      .slice(0, 5);
  }, [entries, recentFilterMonth]);

  if (!isLoaded || !currentUser) return null;

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-headline font-bold text-primary">Histórico de Mordomia</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Consulte o resumo de entradas e dízimos de meses anteriores.</p>
          </div>
        </header>

        {/* Tabela de Dízimo Anual */}
        <Card className="shadow-lg border-border/50 mb-8 overflow-hidden">
          <CardHeader className="bg-white/50 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-accent" />
              <div>
                <CardTitle className="font-headline text-lg sm:text-xl">Dízimo Anual</CardTitle>
                <CardDescription className="text-xs">Detalhamento mensal das contribuições</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mr-4 hidden md:flex italic">
                <ArrowRightLeft className="h-3 w-3" /> Deslize para ver os meses
              </div>
              <Select value={annualFilterYear} onValueChange={setAnnualFilterYear}>
                <SelectTrigger className="w-[120px] h-9 text-xs">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {annualSummary.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Nenhum dado disponível para o ano de {annualFilterYear}.
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted">
                <Table className="border-separate border-spacing-0">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="bg-muted/30 sticky left-0 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Ano</TableHead>
                      {MONTHS_SHORT.map(m => (
                        <TableHead key={m} className="text-center min-w-[70px] sm:min-w-[90px] text-[10px] sm:text-xs font-bold uppercase">{m}</TableHead>
                      ))}
                      <TableHead className="text-right bg-primary/10 font-bold text-primary min-w-[110px] sticky right-0 z-20 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">Total Ano</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {annualSummary.map((yearRow) => (
                      <TableRow key={yearRow.year} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-bold bg-white sticky left-0 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{yearRow.year}</TableCell>
                        {yearRow.months.map((tithe, idx) => (
                          <TableCell key={idx} className="text-center text-[10px] sm:text-xs px-1 sm:px-4">
                            {tithe > 0 ? (
                              <span className="font-medium text-primary">
                                {currencyFormatter.format(tithe).replace('R$', '').trim()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground opacity-30">-</span>
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-headline font-bold text-primary bg-primary/5 sticky right-0 z-10 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          {currencyFormatter.format(yearRow.totalYear)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Resumo Mensal */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-border/50 h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-headline text-lg sm:text-xl">Resumo Mensal de Entradas</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Consolidado por período.</CardDescription>
                </div>
                <Select value={monthlyFilterYear} onValueChange={setMonthlyFilterYear}>
                  <SelectTrigger className="w-[110px] h-9 text-xs">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                {groupedEntries.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground px-4">
                    Nenhum registro encontrado para {monthlyFilterYear}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Mês/Ano</TableHead>
                          <TableHead className="hidden sm:table-cell">Lançamentos</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm">Total</TableHead>
                          <TableHead className="text-right text-primary font-bold text-xs sm:text-sm">Dízimo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedEntries.map((group) => (
                          <TableRow key={group.key} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="capitalize font-medium text-xs sm:text-sm">
                              {group.month} {group.year}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm">{group.count} registro(s)</TableCell>
                            <TableCell className="text-right text-xs sm:text-sm">
                              {currencyFormatter.format(group.total)}
                            </TableCell>
                            <TableCell className="text-right font-headline font-bold text-primary text-xs sm:text-sm">
                              {currencyFormatter.format(group.tithe)}
                            </TableCell>
                          </TableRow>
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
                <div className="flex flex-col">
                  <CardTitle className="font-headline text-lg">Últimos Registros</CardTitle>
                  <CardDescription className="text-xs">Lançamentos individuais detalhados.</CardDescription>
                </div>
                <Select value={recentFilterMonth} onValueChange={setRecentFilterMonth}>
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
              <CardContent>
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
                  {filteredRecentEntries.length > 0 && (
                    <p className="text-center text-[10px] text-muted-foreground italic pt-2">
                      {recentFilterMonth === "all" ? "Exibindo os 5 lançamentos mais recentes" : `Exibindo lançamentos de ${availableMonths.find(m => m[0] === recentFilterMonth)?.[1] || ''}`}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
