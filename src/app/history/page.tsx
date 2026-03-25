
"use client";

import { useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, getMonth, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays } from "lucide-react";

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-headline font-bold text-primary">Histórico de Mordomia</h1>
          <p className="text-muted-foreground">Consulte o resumo de entradas e dízimos de meses anteriores.</p>
        </header>

        {/* Tabela de Dízimo Anual */}
        <Card className="shadow-lg border-border/50 mb-8 overflow-hidden">
          <CardHeader className="bg-white/50 border-b">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-accent" />
              <CardTitle className="font-headline text-xl">Dízimo Anual</CardTitle>
            </div>
            <CardDescription>Resumo dos dízimos (10%) acumulados por mês em cada ano.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {annualSummary.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Nenhum dado anual disponível.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="bg-muted/30">Ano</TableHead>
                      {MONTHS_SHORT.map(m => (
                        <TableHead key={m} className="text-center min-w-[80px] text-xs font-bold uppercase">{m}</TableHead>
                      ))}
                      <TableHead className="text-right bg-primary/5 font-bold text-primary">Total Ano</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {annualSummary.map((yearRow) => (
                      <TableRow key={yearRow.year} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-bold bg-muted/10">{yearRow.year}</TableCell>
                        {yearRow.months.map((tithe, idx) => (
                          <TableCell key={idx} className="text-center text-xs">
                            {tithe > 0 ? (
                              <span className="font-medium text-primary">
                                {currencyFormatter.format(tithe).replace('R$', '').trim()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground opacity-30">-</span>
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-headline font-bold text-primary bg-primary/5">
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

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-border/50">
              <CardHeader>
                <CardTitle className="font-headline text-xl">Resumo Mensal de Entradas</CardTitle>
                <CardDescription>Consolidado de todas as entradas registradas por período.</CardDescription>
              </CardHeader>
              <CardContent>
                {groupedEntries.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    Nenhum registro encontrado.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mês/Ano</TableHead>
                        <TableHead>Lançamentos</TableHead>
                        <TableHead className="text-right">Total Recebido</TableHead>
                        <TableHead className="text-right text-primary font-bold">Dízimo (10%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedEntries.map((group) => (
                        <TableRow key={group.key} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="capitalize font-medium">
                            {group.month} {group.year}
                          </TableCell>
                          <TableCell>{group.count} registro(s)</TableCell>
                          <TableCell className="text-right">
                            {currencyFormatter.format(group.total)}
                          </TableCell>
                          <TableCell className="text-right font-headline font-bold text-primary">
                            {currencyFormatter.format(group.tithe)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="shadow-md border-border/50 bg-white/50 h-full">
              <CardHeader>
                <CardTitle className="font-headline text-lg">Últimos Registros</CardTitle>
                <CardDescription>Detalhamento das entradas individuais.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {entries.slice(0, 10).map((entry) => (
                    <div key={entry.id} className="flex justify-between items-center p-3 rounded-lg bg-white border border-border/40 shadow-sm">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-primary line-clamp-1">{entry.description}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(entry.date), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <span className="font-bold text-sm">
                        {currencyFormatter.format(entry.amount)}
                      </span>
                    </div>
                  ))}
                  {entries.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum registro encontrado.
                    </p>
                  )}
                  {entries.length > 10 && (
                    <p className="text-center text-xs text-muted-foreground italic">
                      Exibindo os 10 registros mais recentes.
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
