
"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, TrendingUp, HandCoins, Plus, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { currentUser, addEntry, entries, isLoaded } = useAppStore();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  if (!isLoaded) return null;
  if (!currentUser) return null;

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  const monthEntries = entries.filter(entry => 
    isWithinInterval(new Date(entry.date), { start: currentMonthStart, end: currentMonthEnd })
  );

  const totalIncome = monthEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const titheAmount = totalIncome * 0.1;

  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Erro no valor",
        description: "Por favor, insira um valor válido para a entrada.",
        variant: "destructive"
      });
      return;
    }
    addEntry(parseFloat(amount), description || "Entrada de Renda", date);
    setAmount("");
    setDescription("");
    toast({
      title: "Sucesso!",
      description: "Entrada registrada com sucesso.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-headline font-bold text-primary">
            Olá, {currentUser.name}!
          </h1>
          <p className="text-muted-foreground">
            Acompanhe suas entradas de {format(now, 'MMMM', { locale: ptBR })}.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3 mb-10">
          <Card className="border-none shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Renda Total do Mês
              </CardTitle>
              <Wallet className="h-5 w-5 text-primary opacity-70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-headline font-bold text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIncome)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Baseado em {monthEntries.length} entradas
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-primary text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wider opacity-90">
                Dízimo Sugerido (10%)
              </CardTitle>
              <HandCoins className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-headline font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(titheAmount)}
              </div>
              <p className="text-xs opacity-80 mt-1">
                Sua contribuição para a obra
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Frequência
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-headline font-bold text-primary">
                {monthEntries.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Registros este mês
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="shadow-lg border-border/50">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center gap-2">
                <Plus className="h-5 w-5 text-accent" />
                Registrar Nova Entrada
              </CardTitle>
              <CardDescription>
                Adicione qualquer valor recebido no período.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddIncome} className="space-y-5">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Valor (R$)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-lg py-6"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição (Opcional)</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Salário, Freelance, Vendas..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6">
                  Registrar Entrada
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-border/50 overflow-hidden">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-accent" />
                Entradas Recentes
              </CardTitle>
              <CardDescription>
                Seus últimos registros deste mês.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {monthEntries.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma entrada registrada este mês.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {monthEntries.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="p-4 flex justify-between items-center hover:bg-muted/30 transition-colors">
                      <div>
                        <div className="font-medium text-primary">{entry.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(entry.date), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                      </div>
                      <div className="font-headline font-bold text-primary text-lg">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
