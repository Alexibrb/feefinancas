"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { useAppStore, IncomeEntry } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, TrendingUp, HandCoins, Plus, Calendar as CalendarIcon, Pencil, Trash2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Dashboard() {
  const { currentUser, addEntry, updateEntry, deleteEntry, entries, isLoaded } = useAppStore();
  const { toast } = useToast();
  
  // States for Adding
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // States for Editing
  const [editingEntry, setEditingEntry] = useState<IncomeEntry | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");

  // States for Deleting
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

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

  const handleOpenEdit = (entry: IncomeEntry) => {
    setEditingEntry(entry);
    setEditAmount(entry.amount.toString());
    setEditDescription(entry.description);
    setEditDate(entry.date);
  };

  const handleUpdateIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    
    if (!editAmount || parseFloat(editAmount) <= 0) {
      toast({
        title: "Erro no valor",
        description: "Por favor, insira um valor válido.",
        variant: "destructive"
      });
      return;
    }

    updateEntry(editingEntry.id, parseFloat(editAmount), editDescription, editDate);
    setEditingEntry(null);
    toast({
      title: "Sucesso!",
      description: "Entrada atualizada com sucesso.",
    });
  };

  const handleDeleteIncome = () => {
    if (!deletingEntryId) return;
    deleteEntry(deletingEntryId);
    setDeletingEntryId(null);
    toast({
      title: "Excluído",
      description: "A entrada foi removida com sucesso.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-primary">
            Olá, {currentUser.name}!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Acompanhe suas entradas de {format(now, 'MMMM', { locale: ptBR })}.
          </p>
        </header>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-8 sm:mb-10">
          <Card className="border-none shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Renda Total do Mês
              </CardTitle>
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary opacity-70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-headline font-bold text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIncome)}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                Baseado em {monthEntries.length} entradas
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-primary text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium uppercase tracking-wider opacity-90">
                Dízimo Sugerido (10%)
              </CardTitle>
              <HandCoins className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-headline font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(titheAmount)}
              </div>
              <p className="text-[10px] sm:text-xs opacity-80 mt-1">
                Sua contribuição para a obra
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Frequência
              </CardTitle>
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-headline font-bold text-primary">
                {monthEntries.length}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                Registros este mês
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
          <Card className="shadow-lg border-border/50 h-fit">
            <CardHeader>
              <CardTitle className="font-headline text-lg sm:text-xl flex items-center gap-2">
                <Plus className="h-5 w-5 text-accent" />
                Registrar Nova Entrada
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Adicione qualquer valor recebido no período.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddIncome} className="space-y-4 sm:space-y-5">
                <div className="grid gap-1.5 sm:gap-2">
                  <Label htmlFor="amount" className="text-xs sm:text-sm">Valor (R$)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-base sm:text-lg py-5 sm:py-6"
                    required
                  />
                </div>
                <div className="grid gap-1.5 sm:gap-2">
                  <Label htmlFor="description" className="text-xs sm:text-sm">Descrição (Opcional)</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Salário, Freelance, Vendas..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="py-5"
                  />
                </div>
                <div className="grid gap-1.5 sm:gap-2">
                  <Label htmlFor="date" className="text-xs sm:text-sm">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="py-5"
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-5 sm:py-6 mt-2">
                  Registrar Entrada
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-border/50 overflow-hidden">
            <CardHeader>
              <CardTitle className="font-headline text-lg sm:text-xl flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-accent" />
                Entradas Recentes
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Seus últimos registros deste mês.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {monthEntries.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Nenhuma entrada registrada este mês.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {monthEntries.slice(0, 6).map((entry) => (
                    <div key={entry.id} className="p-4 flex justify-between items-center hover:bg-muted/30 transition-colors group">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-primary text-sm sm:text-base truncate pr-2">{entry.description}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(entry.date), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="font-headline font-bold text-primary text-base sm:text-lg whitespace-nowrap">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.amount)}
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleOpenEdit(entry)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeletingEntryId(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {monthEntries.length > 6 && (
                    <div className="p-3 text-center">
                      <Button variant="link" className="text-xs text-muted-foreground" onClick={() => window.location.href='/history'}>
                        Ver todo o histórico
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Entrada</DialogTitle>
            <DialogDescription>
              Altere os detalhes do lançamento financeiro.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateIncome} className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-amount">Valor (R$)</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Input
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Data</Label>
              <Input
                id="edit-date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                required
              />
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setEditingEntry(null)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={!!deletingEntryId} onOpenChange={(open) => !open && setDeletingEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o registro de entrada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIncome} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
