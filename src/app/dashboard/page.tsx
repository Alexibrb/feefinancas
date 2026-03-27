"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, TrendingUp, HandCoins, Plus, Calendar as CalendarIcon, Pencil, Trash2, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, where, orderBy } from "firebase/firestore";
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
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  // Data Fetching
  const profileRef = useMemoFirebase(() => user ? doc(db, "users", user.uid) : null, [user, db]);
  const { data: profile } = useDoc(profileRef);

  const entriesRef = useMemoFirebase(() => user ? collection(db, "users", user.uid, "incomeEntries") : null, [user, db]);
  const entriesQuery = useMemoFirebase(() => entriesRef ? query(entriesRef, orderBy("entryDate", "desc")) : null, [entriesRef]);
  const { data: entries, isLoading: isEntriesLoading } = useCollection(entriesQuery);

  // States for Adding
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // States for Editing
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");

  // States for Deleting
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  if (isUserLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  const monthEntries = (entries || []).filter(entry => 
    isWithinInterval(new Date(entry.entryDate), { start: currentMonthStart, end: currentMonthEnd })
  );

  const totalIncome = monthEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const titheAmount = totalIncome * 0.1;
  const isAllPaid = monthEntries.length > 0 && monthEntries.every(e => e.isPaid);

  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0 || !entriesRef) {
      toast({ title: "Erro no valor", description: "Insira um valor válido.", variant: "destructive" });
      return;
    }
    
    const val = parseFloat(amount);
    addDocumentNonBlocking(entriesRef, {
      userId: user.uid,
      amount: val,
      description: description || "Entrada de Renda",
      entryDate: date,
      calculatedTithe: val * 0.1,
      isPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setAmount("");
    setDescription("");
    toast({ title: "Sucesso!", description: "Entrada registrada." });
  };

  const handleOpenEdit = (entry: any) => {
    if (entry.isPaid) {
      toast({ title: "Registro Bloqueado", description: "Entradas com dízimo devolvido não podem ser editadas.", variant: "destructive" });
      return;
    }
    setEditingEntry(entry);
    setEditAmount(entry.amount.toString());
    setEditDescription(entry.description);
    setEditDate(entry.entryDate);
  };

  const handleUpdateIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry || !user) return;
    
    const val = parseFloat(editAmount);
    const entryRef = doc(db, "users", user.uid, "incomeEntries", editingEntry.id);
    
    updateDocumentNonBlocking(entryRef, {
      amount: val,
      description: editDescription,
      entryDate: editDate,
      calculatedTithe: val * 0.1,
      updatedAt: new Date().toISOString(),
    });

    setEditingEntry(null);
    toast({ title: "Sucesso!", description: "Entrada atualizada." });
  };

  const handleDeleteIncome = () => {
    if (!deletingEntryId || !user) return;
    const entryRef = doc(db, "users", user.uid, "incomeEntries", deletingEntryId);
    deleteDocumentNonBlocking(entryRef);
    setDeletingEntryId(null);
    toast({ title: "Excluído", description: "Registro removido." });
  };

  const handleTogglePaid = (entry: any) => {
    if (!user) return;
    const entryRef = doc(db, "users", user.uid, "incomeEntries", entry.id);
    const becomingPaid = !entry.isPaid;
    
    updateDocumentNonBlocking(entryRef, {
      isPaid: becomingPaid,
      updatedAt: new Date().toISOString(),
    });
    
    if (becomingPaid) {
      toast({ title: "Dízimo Devolvido", description: "Deus abençoe sua vida" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-primary">
            Olá, {profile?.firstName || "Usuário"}!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerencie suas entradas de {format(now, 'MMMM', { locale: ptBR })}.
          </p>
        </header>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-8 sm:mb-10">
          <Card className="border-none shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Renda Total do Mês
              </CardTitle>
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-accent opacity-70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-headline font-bold text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIncome)}
              </div>
            </CardContent>
          </Card>

          <Card className={cn(
            "border-none shadow-md text-white transition-colors duration-300",
            isAllPaid ? "bg-emerald-700" : "bg-accent"
          )}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium uppercase tracking-wider opacity-90">
                {isAllPaid ? "Dízimo Devolvido" : "Dízimo Sugerido (10%)"}
              </CardTitle>
              <HandCoins className="h-4 w-4 sm:h-5 sm:w-5 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-headline font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(titheAmount)}
              </div>
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
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
          <Card className="shadow-lg border-border/50 h-fit">
            <CardHeader>
              <CardTitle className="font-headline text-lg sm:text-xl flex items-center gap-2 text-primary">
                <Plus className="h-5 w-5 text-accent" />
                Registrar Nova Entrada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddIncome} className="space-y-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="amount">Valor (R$)</Label>
                  <Input id="amount" type="number" step="0.01" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" placeholder="Ex: Salário..." value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="date">Data</Label>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white">Registrar Entrada</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-border/50">
            <CardHeader>
              <CardTitle className="font-headline text-lg flex items-center gap-2 text-primary">
                <CalendarIcon className="h-5 w-5 text-accent" />
                Entradas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isEntriesLoading ? (
                <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" /></div>
              ) : monthEntries.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma entrada este mês.</div>
              ) : (
                <div className="divide-y divide-border">
                  {monthEntries.slice(0, 6).map((entry) => (
                    <div key={entry.id} className={cn("p-4 flex justify-between items-center transition-colors group", entry.isPaid ? "bg-emerald-50/30" : "hover:bg-muted/30")}>
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleTogglePaid(entry)} className={cn("transition-colors", entry.isPaid ? "text-emerald-700" : "text-muted-foreground/30 hover:text-accent")}>
                          {entry.isPaid ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                        </button>
                        <div>
                          <div className={cn("font-medium text-sm truncate", entry.isPaid ? "text-emerald-900" : "text-primary")}>{entry.description}</div>
                          <div className="text-xs text-muted-foreground">{format(new Date(entry.entryDate), 'dd/MM/yyyy', { locale: ptBR })}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="font-headline font-bold text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.amount)}</div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-accent" onClick={() => handleOpenEdit(entry)} disabled={entry.isPaid}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingEntryId(entry.id)} disabled={entry.isPaid}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Entrada</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdateIncome} className="space-y-4 py-2">
            <div className="grid gap-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} required /></div>
            <div className="grid gap-2"><Label>Descrição</Label><Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Data</Label><Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required /></div>
            <DialogFooter><Button type="submit" className="bg-accent text-white hover:bg-accent/90">Salvar Alterações</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingEntryId} onOpenChange={(open) => !open && setDeletingEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja excluir permanentemente este registro?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIncome} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
