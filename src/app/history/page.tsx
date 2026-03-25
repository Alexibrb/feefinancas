"use client";

import { useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, getMonth, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function HistoryPage() {
  const { entries, currentUser, isLoaded } = useAppStore();

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
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([year, months]) => ({
        year,
        months,
        totalYear: months.reduce((sum, val) => sum + val, 0)
      }));
  }, [entries]);

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
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, data]) => ({ key, ...data }));
  }, [entries]);

  if (!isLoaded || !currentUser) return null;

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-primary">Histórico de Mordomia</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Consulte o resumo de entradas e dízimos de meses anteriores.</p>
        </header>

        {/* Tabela de Dízimo Anual */}
        <Card className="shadow-lg border-border/50 mb-8 overflow-hidden">
          <CardHeader className="bg-white/50 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-accent" />
              <CardTitle className="font-headline text-lg sm:text-xl">Dízimo Anual</CardTitle>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground sm:hidden italic">
              <ArrowRightLeft className="h-3 w-3" /> Deslize para ver os meses
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {annualSummary.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Nenhum dado anual disponível.
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
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-border/50">
              <CardHeader>
                <CardTitle className="font-headline text-lg sm:text-xl">Resumo Mensal de Entradas</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Consolidado de todas as entradas registradas por período.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                {groupedEntries.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground px-4">
                    Nenhum registro encontrado.
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

          <div className="lg:col-span-1">
            <Card className="shadow-md border-border/50 bg-white/50 h-full">
              <CardHeader>
                <CardTitle className="font-headline text-lg">Últimos Registros</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Detalhamento das entradas individuais.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {entries.slice(0, 8).map((entry) => (
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
                  {entries.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum registro encontrado.
                    </p>
                  )}
                  {entries.length > 8 && (
                    <p className="text-center text-[10px] text-muted-foreground italic pt-2">
                      Exibindo os 8 registros mais recentes.
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
