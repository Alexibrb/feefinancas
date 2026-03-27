"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, TrendingUp, HandCoins, Plus, Calendar as CalendarIcon, Pencil, CheckCircle2, Circle, Loader2, LineChart as LineChartIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, getYear, getMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
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
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const chartConfig = {
  tithe: {
    label: "Dízimo",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig;

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

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

  const profileRef = useMemoFirebase(() => user ? doc(db, "users", user.uid) : null, [user, db]);
  const { data: profile } = useDoc(profileRef);

  const entriesRef = useMemoFirebase(() => user ? collection(db, "users", user.uid, "incomeEntries") : null, [user, db]);
  const entriesQuery = useMemoFirebase(() => entriesRef ? query(entriesRef, orderBy("entryDate", "asc")) : null, [entriesRef]);
  const { data: entries, isLoading: isEntriesLoading } = useCollection(entriesQuery);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [chartYear, setChartYear] = useState<string>("all");
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    (entries || []).forEach(e => years.add(getYear(parseISO(e.entryDate)).toString()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [entries]);

  const chartData = useMemo(() => {
    if (!entries) return [];
    const monthlyGroups: Record<string, number> = {};
    entries.forEach(entry => {
      const d = parseISO(entry.entryDate);
      const year = getYear(d).toString();
      const monthIdx = getMonth(d);
      if (chartYear === "all" || year === chartYear) {
        const key = chartYear === "all" ? `${MONTH_LABELS[monthIdx]} ${year}` : MONTH_LABELS[monthIdx];
        monthlyGroups[key] = (monthlyGroups[key] || 0) + (entry.amount * 0.1);
      }
    });
    return Object.entries(monthlyGroups).map(([name, tithe]) => ({ name, tithe }));
  }, [entries, chartYear]);

  if (isUserLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const now = new Date();
  const monthEntries = (entries || []).filter(entry => 
    isWithinInterval(new Date(entry.entryDate), { start: startOfMonth(now), end: endOfMonth(now) })
  );
  const totalIncome = monthEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const titheAmount = totalIncome * 0.1;
  const isAllPaid = monthEntries.length > 0 && monthEntries.every(e => e.isPaid);

  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0 || !entriesRef) return;
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
    updateDocumentNonBlocking(entryRef, { isPaid: !entry.isPaid, updatedAt: new Date().toISOString() });
    if (!entry.isPaid) toast({ title: "Dízimo Devolvido", description: "Deus abençoe sua vida" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 w-full">
        <header>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-black">
            Olá, {profile?.firstName || "Usuário"}!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerencie suas entradas de {format(now, 'MMMM', { locale: ptBR })}.
          </p>
        </header>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full">
          <Card className="border-none shadow-md bg-white w-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Renda Total do Mês</CardTitle>
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-accent opacity-70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-headline font-bold text-black">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIncome)}
              </div>
            </CardContent>
          </Card>

          <Card className={cn("border-none shadow-md text-white transition-colors duration-300 w-full", isAllPaid ? "bg-accent" : "bg-accent/90")}>
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

          <Card className="border-none shadow-md bg-white w-full sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Frequência</CardTitle>
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-headline font-bold text-black">{monthEntries.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 w-full">
          <Card className="shadow-lg border-border/50 h-fit w-full">
            <CardHeader>
              <CardTitle className="font-headline text-lg sm:text-xl flex items-center gap-2 text-black">
                <Plus className="h-5 w-5 text-accent" /> Registrar Nova Entrada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddIncome} className="space-y-4">
                <div className="grid gap-1.5"><Label htmlFor="amount">Valor (R$)</Label><Input id="amount" type="number" step="0.01" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
                <div className="grid gap-1.5"><Label htmlFor="description">Descrição</Label><Input id="description" placeholder="Ex: Salário..." value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                <div className="grid gap-1.5"><Label htmlFor="date">Data</Label><Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white">Registrar Entrada</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-border/50 w-full overflow-hidden">
            <CardHeader>
              <CardTitle className="font-headline text-lg flex items-center gap-2 text-black">
                <CalendarIcon className="h-5 w-5 text-accent" /> Entradas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isEntriesLoading ? <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" /></div> : 
              monthEntries.length === 0 ? <div className="p-8 text-center text-muted-foreground text-sm">Sem entradas este mês.</div> : (
                <div className="divide-y divide-border overflow-x-auto">
                  {[...monthEntries].reverse().slice(0, 6).map((entry) => (
                    <div key={entry.id} className={cn("p-4 flex justify-between items-center min-w-[300px]", entry.isPaid ? "bg-emerald-50/30" : "hover:bg-muted/30")}>
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleTogglePaid(entry)} className={cn("transition-colors", entry.isPaid ? "text-emerald-700" : "text-destructive")}>
                          {entry.isPaid ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                        </button>
                        <div className="min-w-0">
                          <div className={cn("font-medium text-sm truncate max-w-[120px]", entry.isPaid ? "text-emerald-900" : "text-black")}>{entry.description}</div>
                          <div className="text-xs text-muted-foreground">{format(parseISO(entry.entryDate), 'dd/MM/yyyy')}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="font-headline font-bold text-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.amount)}</div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingEntry(entry); setEditAmount(entry.amount.toString()); setEditDescription(entry.description); setEditDate(entry.entryDate); }} disabled={entry.isPaid}><Pencil className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg border-border/50 w-full overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-headline text-lg sm:text-xl flex items-center gap-2 text-black"><LineChartIcon className="h-5 w-5 text-accent" /> Evolução de Dízimos</CardTitle>
              <CardDescription>Resumo mensal de contribuições</CardDescription>
            </div>
            <Select value={chartYear} onValueChange={setChartYear}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o Período</SelectItem>
                {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {chartData.length === 0 ? <div className="h-full flex items-center justify-center text-muted-foreground">Sem dados para o gráfico.</div> : (
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <LineChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(value) => `R$ ${value}`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="tithe" stroke="var(--color-tithe)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-tithe)" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ChartContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="py-8 text-center text-xs text-muted-foreground border-t mt-auto bg-white/50 w-full">
        <p className="font-medium">Alex Aves - 2026</p>
      </footer>

      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Entrada</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdateIncome} className="space-y-4 py-2">
            <div className="grid gap-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} required /></div>
            <div className="grid gap-2"><Label>Descrição</Label><Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Data</Label><Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required /></div>
            <DialogFooter><Button type="submit" className="bg-accent text-white hover:bg-accent/90 w-full sm:w-auto">Salvar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingEntryId} onOpenChange={(open) => !open && setDeletingEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja excluir este registro?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIncome} className="bg-destructive text-white">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
