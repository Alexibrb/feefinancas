"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format, parseISO, getMonth, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  RotateCcw, 
  FileDown, 
  CheckCircle2, 
  Circle,
  Pencil,
  Trash2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy } from "firebase/firestore";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const currentYear = new Date().getFullYear().toString();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  const entriesRef = useMemoFirebase(() => user ? collection(db, "users", user.uid, "incomeEntries") : null, [user, db]);
  const entriesQuery = useMemoFirebase(() => entriesRef ? query(entriesRef, orderBy("entryDate", "desc")) : null, [entriesRef]);
  const { data: entries, isLoading: isEntriesLoading } = useCollection(entriesQuery);

  const [annualFilterYear, setAnnualFilterYear] = useState(currentYear);
  const [monthlyFilterYear, setMonthlyFilterYear] = useState(currentYear);
  const [recentFilterMonth, setRecentFilterMonth] = useState("all");
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    (entries || []).forEach(e => years.add(getYear(parseISO(e.entryDate)).toString()));
    if (years.size === 0) years.add(currentYear);
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [entries, currentYear]);

  const availableMonths = useMemo(() => {
    const monthsMap = new Map<string, string>();
    (entries || []).forEach(e => {
      const d = parseISO(e.entryDate);
      const key = format(d, 'yyyy-MM');
      const label = format(d, 'MMMM yyyy', { locale: ptBR });
      monthsMap.set(key, label);
    });
    return Array.from(monthsMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  const annualSummary = useMemo(() => {
    const years: Record<string, number[]> = {};
    (entries || []).forEach(entry => {
      const date = parseISO(entry.entryDate);
      const year = getYear(date).toString();
      const monthIndex = getMonth(date);
      if (!years[year]) years[year] = new Array(12).fill(0);
      years[year][monthIndex] += (entry.amount * 0.1);
    });
    const yearData = annualFilterYear === "all" ? null : (years[annualFilterYear] || new Array(12).fill(0));
    return { year: annualFilterYear, months: yearData || new Array(12).fill(0), totalYear: (yearData || []).reduce((s, v) => s + v, 0) };
  }, [entries, annualFilterYear]);

  const groupedEntries = useMemo(() => {
    const groups: Record<string, any> = {};
    (entries || []).forEach(entry => {
      const date = parseISO(entry.entryDate);
      const key = format(date, 'yyyy-MM');
      if (!groups[key]) groups[key] = { month: format(date, 'MMMM', { locale: ptBR }), year: format(date, 'yyyy'), total: 0, tithe: 0, items: [], isFullyPaid: true };
      groups[key].total += entry.amount;
      groups[key].tithe = groups[key].total * 0.1;
      groups[key].items.push(entry);
      if (!entry.isPaid) groups[key].isFullyPaid = false;
    });
    return Object.entries(groups)
      .filter(([, d]) => monthlyFilterYear === "all" || d.year === monthlyFilterYear)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, data]) => ({ key, ...data }));
  }, [entries, monthlyFilterYear]);

  const handleToggleEntryPaid = (e: React.MouseEvent, entry: any) => {
    e.stopPropagation();
    if (!user) return;
    const entryRef = doc(db, "users", user.uid, "incomeEntries", entry.id);
    updateDocumentNonBlocking(entryRef, { isPaid: !entry.isPaid, updatedAt: new Date().toISOString() });
    if (!entry.isPaid) toast({ title: "Dízimo Confirmado", description: "Deus abençoe sua vida" });
  };

  const handleMarkMonthAsPaidAction = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    if (!user || !entries) return;
    entries.filter(ent => format(parseISO(ent.entryDate), 'yyyy-MM') === key).forEach(ent => {
      if (!ent.isPaid) updateDocumentNonBlocking(doc(db, "users", user.uid, "incomeEntries", ent.id), { isPaid: true, updatedAt: new Date().toISOString() });
    });
    toast({ title: "Mês Confirmado", description: "Deus abençoe sua vida" });
  };

  const exportPDF = (title: string, tableData: any[], headers: string[], fileName: string) => {
    const doc = new jsPDF();
    doc.text(title, 14, 15);
    autoTable(doc, { head: [headers], body: tableData, startY: 25 });
    doc.save(`${fileName}.pdf`);
  };

  if (isUserLoading || !user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 w-full">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-headline font-bold text-black">Histórico de Finanças</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Resumo de entradas e checkout de dízimos.</p>
          </div>
          {(annualFilterYear !== currentYear || monthlyFilterYear !== currentYear || recentFilterMonth !== "all") && (
            <Button variant="outline" size="sm" onClick={() => { setAnnualFilterYear(currentYear); setMonthlyFilterYear(currentYear); setRecentFilterMonth("all"); }} className="w-full sm:w-auto"><RotateCcw className="h-4 w-4 mr-2" /> Limpar</Button>
          )}
        </header>

        <div className="grid gap-6 lg:grid-cols-3 w-full">
          <div className="lg:col-span-2 space-y-6 w-full">
            <Card className="shadow-lg border-border/50 overflow-hidden w-full">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                  <CardTitle className="font-headline text-lg">Resumo Mensal</CardTitle>
                  <Select value={monthlyFilterYear} onValueChange={setMonthlyFilterYear}><SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
                </div>
                <Button variant="ghost" size="icon" onClick={() => exportPDF("Resumo Mensal", groupedEntries.map(g => [`${g.month} ${g.year}`, currencyFormatter.format(g.total), currencyFormatter.format(g.tithe), g.isFullyPaid ? "Dízimo Devolvido" : "Pendente"]), ["Mês/Ano", "Total", "Dízimo", "Status"], "resumo-mensal")}><FileDown className="h-5 w-5" /></Button>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader className="bg-muted/10"><TableRow><TableHead>Mês/Ano</TableHead><TableHead className="text-center">Total</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-right text-accent font-bold">Dízimo</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {groupedEntries.map((group) => (
                      <React.Fragment key={group.key}>
                        <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={() => setExpandedMonth(expandedMonth === group.key ? null : group.key)}>
                          <TableCell className="capitalize font-medium text-black">{group.month} {group.year}</TableCell>
                          <TableCell className="text-center text-black">{currencyFormatter.format(group.total)}</TableCell>
                          <TableCell className="text-center">
                            {group.isFullyPaid ? <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Dízimo Devolvido</Badge> : 
                            <Button size="sm" variant="outline" className="h-7 text-[10px] border-destructive text-destructive hover:bg-destructive hover:text-white" onClick={(e) => handleMarkMonthAsPaidAction(e, group.key)}>Devolver Dízimo</Button>}
                          </TableCell>
                          <TableCell className="text-right font-headline font-bold text-accent">{currencyFormatter.format(group.tithe)}</TableCell>
                        </TableRow>
                        {expandedMonth === group.key && (
                          <TableRow className="bg-muted/5"><TableCell colSpan={4} className="p-4"><div className="space-y-2">
                            {group.items.map((item: any) => (
                              <div key={item.id} className="flex justify-between items-center p-3 bg-white rounded border border-border/40 text-xs shadow-sm">
                                <div className="flex items-center gap-2">
                                  <button onClick={(e) => handleToggleEntryPaid(e, item)} className={cn("transition-colors", item.isPaid ? "text-emerald-700" : "text-destructive")}>{item.isPaid ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}</button>
                                  <div className="flex flex-col"><span className="font-medium text-black">{item.description}</span><span className="text-[10px] text-muted-foreground">{format(parseISO(item.entryDate), 'dd/MM/yyyy')}</span></div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="font-bold text-black">{currencyFormatter.format(item.amount)}</span>
                                  {!item.isPaid && <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditingEntry(item); setEditAmount(item.amount.toString()); setEditDescription(item.description); setEditDate(item.entryDate); }}><Pencil className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingEntryId(item.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                  </div>}
                                </div>
                              </div>
                            ))}
                          </div></TableCell></TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-border/50 overflow-hidden w-full">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                  <CardTitle className="font-headline text-lg">Resumo Anual</CardTitle>
                  <Select value={annualFilterYear} onValueChange={setAnnualFilterYear}><SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div className="hidden sm:block text-[10px] uppercase font-bold text-muted-foreground">Total: {currencyFormatter.format(annualSummary.totalYear)}</div>
                  <Button variant="ghost" size="icon" onClick={() => exportPDF(`Resumo Anual ${annualSummary.year}`, MONTHS_FULL.map((m, i) => [m, currencyFormatter.format(annualSummary.months[i])]), ["Mês", "Dízimo"], "resumo-anual")}><FileDown className="h-5 w-5" /></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader className="bg-muted/10"><TableRow><TableHead>Mês</TableHead><TableHead className="text-right">Dízimo</TableHead></TableRow></TableHeader>
                  <TableBody>{MONTHS_FULL.map((m, i) => (<TableRow key={m} className="hover:bg-muted/30"><TableCell className="font-medium text-black">{m}</TableCell><TableCell className="text-right font-bold text-accent">{currencyFormatter.format(annualSummary.months[i])}</TableCell></TableRow>))}</TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-md border-border/50 bg-white/50 h-fit w-full">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between"><CardTitle className="font-headline text-lg">Últimos Lançamentos</CardTitle></div>
              <Select value={recentFilterMonth} onValueChange={setRecentFilterMonth}><SelectTrigger className="w-full h-9 text-xs"><SelectValue placeholder="Mês" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{availableMonths.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEntriesLoading ? <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" /></div> : 
              entries?.length === 0 ? <div className="py-8 text-center text-muted-foreground text-xs">Sem registros.</div> : 
              entries?.filter(e => recentFilterMonth === "all" || format(parseISO(e.entryDate), 'yyyy-MM') === recentFilterMonth).slice(0, 10).map((entry) => (
                <div key={entry.id} className={cn("flex justify-between items-center p-3 rounded-lg border border-border/40 shadow-sm", entry.isPaid ? "bg-emerald-50" : "bg-white")}>
                  <div className="flex flex-col min-w-0 flex-1"><span className="text-sm font-medium truncate text-black">{entry.description}</span><span className="text-[10px] text-muted-foreground">{format(parseISO(entry.entryDate), 'dd/MM/yyyy')}</span></div>
                  <span className="font-bold text-sm ml-2 text-black">{currencyFormatter.format(entry.amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="py-8 text-center text-xs text-muted-foreground border-t mt-auto bg-white/50 w-full">
        <p className="font-medium">Alex Aves - 2026</p>
      </footer>

      <Dialog open={!!editingEntry} onOpenChange={(o) => !o && setEditingEntry(null)}>
        <DialogContent><DialogHeader><DialogTitle>Editar Lançamento</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (!editingEntry || !user) return; updateDocumentNonBlocking(doc(db, "users", user.uid, "incomeEntries", editingEntry.id), { amount: parseFloat(editAmount), description: editDescription, entryDate: editDate, calculatedTithe: parseFloat(editAmount) * 0.1, updatedAt: new Date().toISOString() }); setEditingEntry(null); toast({ title: "Sucesso!", description: "Lançamento atualizado." }); }} className="space-y-4 py-2">
            <div className="grid gap-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} required /></div>
            <div className="grid gap-2"><Label>Descrição</Label><Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Data</Label><Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required /></div>
            <DialogFooter><Button type="submit" className="bg-accent text-white w-full sm:w-auto">Salvar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingEntryId} onOpenChange={(o) => !o && setDeletingEntryId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir Lançamento?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (!deletingEntryId || !user) return; deleteDocumentNonBlocking(doc(db, "users", user.uid, "incomeEntries", deletingEntryId)); setDeletingEntryId(null); toast({ title: "Excluído", description: "Lançamento removido." }); }} className="bg-destructive text-white">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
