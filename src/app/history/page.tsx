
"use client";

import { useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function HistoryPage() {
  const { entries, currentUser, isLoaded } = useAppStore();

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-headline font-bold text-primary">Histórico de Mordomia</h1>
          <p className="text-muted-foreground">Consulte o resumo de entradas e dízimos de meses anteriores.</p>
        </header>

        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Resumo Mensal</CardTitle>
            <CardDescription>Consolidado de todas as entradas registradas por período.</CardDescription>
          </CardHeader>
          <CardContent>
            {groupedEntries.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p className="mb-4">Nenhum registro encontrado.</p>
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
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(group.total)}
                      </TableCell>
                      <TableCell className="text-right font-headline font-bold text-primary">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(group.tithe)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="mt-8">
          <Card className="shadow-md border-border/50 bg-white/50">
            <CardHeader>
              <CardTitle className="font-headline text-lg">Todos os Registros Individuais</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(parseISO(entry.date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Nenhum registro individual encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
