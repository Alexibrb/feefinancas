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
  Wallet, 
  HandCoins, 
  RotateCcw, 
  FileDown, 
  CheckCircle2, 
  Circle,
  Pencil,
  Trash2,
  Loader2,
  CalendarDays
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

  // Data Fetching
  const entriesRef = useMemoFirebase(() => user ? collection(db, "users", user.uid, "incomeEntries") : null, [user, db]);
  const entriesQuery = useMemoFirebase(() => entriesRef ? query(entriesRef, orderBy("entryDate", "desc")) : null, [entriesRef]);
  const { data: entries, isLoading: isEntriesLoading } = useCollection(entriesQuery);

  // Estados dos Filtros
  const [annualFilterYear, setAnnualFilterYear] = useState(currentYear);
  const [monthlyFilterYear, setMonthlyFilterYear] = useState(currentYear);
  const [recentFilterMonth, setRecentFilterMonth] = useState("all");
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // Estados para Edição
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");

  // Estado para Exclusão
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const resetFilters = () => {
    setAnnualFilterYear(currentYear);
    setMonthlyFilterYear(currentYear);
    setRecentFilterMonth("all");
    setExpandedMonth(null);
  };

  const hasActiveFilters = annualFilterYear !== currentYear || 
                          monthlyFilterYear !== currentYear || 
                          recentFilterMonth !== "all";

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
      isFullyPaid: boolean,
      items: any[] 
    }> = {};
    
    (entries || []).forEach(entry => {
      const date = parseISO(entry.entryDate);
      const key = format(date, 'yyyy-MM');
      const monthName = format(date, 'MMMM', { locale: ptBR });
      const year = format(date, 'yyyy');
      
      if (!groups[key]) {
        groups[key] = { month: monthName, year, total: 0, tithe: 0, count: 0, items: [], isFullyPaid: true };
      }
      
      groups[key].total += entry.amount;
      groups[key].tithe = groups[key].total * 0.1;
      groups[key].count += 1;
      groups[key].items.push(entry);
      if (!entry.isPaid) groups[key].isFullyPaid = false;
    });

    return Object.entries(groups)
      .filter(([, data]) => monthlyFilterYear === "all" || data.year === monthlyFilterYear)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, data]) => ({ 
        key, 
        ...data,
        items: data.items.sort((a, b) => b.entryDate.localeCompare(a.entryDate))
      }));
  }, [entries, monthlyFilterYear]);

  const totalMonthlyTithe = useMemo(() => {
    return groupedEntries.reduce((sum, group) => sum + group.tithe, 0);
  }, [groupedEntries]);

  const totalMonthlyIncome = useMemo(() => {
    return groupedEntries.reduce((sum, group) => sum + group.total, 0);
  }, [groupedEntries]);

  const filteredRecentEntries = useMemo(() => {
    return [...(entries || [])]
      .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
      .filter(e => recentFilterMonth === "all" || format(parseISO(e.entryDate), 'yyyy-MM') === recentFilterMonth);
  }, [entries, recentFilterMonth]);

  const handleToggleEntryPaid = (e: React.MouseEvent, entry: any) => {
    e.stopPropagation();
    if (!user) return;
    const entryRef = doc(db, "users", user.uid, "incomeEntries", entry.id);
    const becomingPaid = !entry.isPaid;
    
    updateDocumentNonBlocking(entryRef, {
      isPaid: becomingPaid,
      updatedAt: new Date().toISOString(),
    });
    
    if (becomingPaid) {
      toast({ title: "Dízimo Confirmado", description: "Deus abençoe sua vida" });
    }
  };

  const handleMarkMonthAsPaidAction = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    if (!user || !entries) return;
    
    const monthEntries = entries.filter(ent => format(parseISO(ent.entryDate), 'yyyy-MM') === key);
    
    monthEntries.forEach(ent => {
      if (!ent.isPaid) {
        const entryRef = doc(db, "users", user.uid, "incomeEntries", ent.id);
        updateDocumentNonBlocking(entryRef, {
          isPaid: true,
          updatedAt: new Date().toISOString(),
        });
      }
    });

    toast({ title: "Mês Confirmado", description: "Deus abençoe sua vida" });
  };

  const handleOpenEdit = (e: React.MouseEvent, entry: any) => {
    e.stopPropagation();
    if (entry.isPaid) return;
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

  const exportPDF = (title: string, tableData: any[], headers: string[], fileName: string) => {
    const doc = new jsPDF();
    doc.text(title, 14, 15);
    autoTable(doc, { head: [headers], body: tableData, startY: 25 });
    doc.save(`${fileName}.pdf`);
  };

  if (isUserLoading || !user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-headline font-bold text-primary">Histórico de Finanças</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Consulte o resumo de entradas e o checkout de dízimos.</p>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={resetFilters} className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" /> Limpar Filtros
            </Button>
          )}
        </header>

        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-lg border-border/50 overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b bg-muted/20">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="font-headline text-lg">Resumo Mensal</CardTitle>
                  <Select value={monthlyFilterYear} onValueChange={setMonthlyFilterYear}>
                    <SelectTrigger className="w-[140px] h-9 text-xs">
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todo o Histórico</SelectItem>
                      {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-border">
                    <Wallet className="h-4 w-4 text-accent" />
                    <div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Total Entradas</div>
                      <div className="text-sm font-bold">{currencyFormatter.format(totalMonthlyIncome)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-accent/10 px-4 py-2 rounded-lg border border-accent/20">
                    <HandCoins className="h-4 w-4 text-accent" />
                    <div>
                      <div className="text-[10px] uppercase font-bold text-accent">Total Dízimo</div>
                      <div className="text-sm font-bold text-accent">{currencyFormatter.format(totalMonthlyTithe)}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => exportPDF("Resumo Mensal de Entradas", groupedEntries.map(g => [`${g.month} ${g.year}`, currencyFormatter.format(g.total), currencyFormatter.format(g.tithe), g.isFullyPaid ? "Dízimo Devolvido" : "Pendente"]), ["Mês/Ano", "Total", "Dízimo", "Status"], "resumo-mensal")}>
                    <FileDown className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isEntriesLoading ? (
                  <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" /></div>
                ) : groupedEntries.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">Nenhum registro encontrado.</div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/10">
                      <TableRow>
                        <TableHead>Mês/Ano</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right text-accent font-bold">Dízimo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedEntries.map((group) => (
                        <React.Fragment key={group.key}>
                          <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={() => setExpandedMonth(expandedMonth === group.key ? null : group.key)}>
                            <TableCell className="capitalize font-medium">{group.month} {group.year}</TableCell>
                            <TableCell className="text-center">{currencyFormatter.format(group.total)}</TableCell>
                            <TableCell className="text-center">
                              {group.isFullyPaid ? (
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Dízimo Devolvido</Badge>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-7 text-[10px] border-destructive text-destructive hover:bg-destructive/10" 
                                  onClick={(e) => handleMarkMonthAsPaidAction(e, group.key)}
                                >
                                  Devolver Dízimo
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-headline font-bold text-accent">{currencyFormatter.format(group.tithe)}</TableCell>
                          </TableRow>
                          {expandedMonth === group.key && (
                            <TableRow className="bg-muted/5">
                              <TableCell colSpan={4} className="p-4">
                                <div className="space-y-2">
                                  {group.items.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center p-3 bg-white rounded border border-border/40 text-xs shadow-sm">
                                      <div className="flex items-center gap-2">
                                        <button onClick={(e) => handleToggleEntryPaid(e, item)} className={cn("transition-colors", item.isPaid ? "text-emerald-700" : "text-destructive hover:text-destructive/80")}>
                                          {item.isPaid ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                                        </button>
                                        <div className="flex flex-col">
                                          <span className="font-medium text-primary">{item.description}</span>
                                          <span className="text-[10px] text-muted-foreground">{format(parseISO(item.entryDate), 'dd/MM/yyyy')}</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <span className="font-bold text-primary">{currencyFormatter.format(item.amount)}</span>
                                        <div className="flex gap-1">
                                          {!item.isPaid && (
                                            <>
                                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-accent" onClick={(e) => handleOpenEdit(e, item)}><Pencil className="h-3.5 w-3.5" /></Button>
                                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setDeletingEntryId(item.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg border-border/50 overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b bg-muted/20">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="font-headline text-lg">Resumo Anual de Dízimos</CardTitle>
                  <Select value={annualFilterYear} onValueChange={setAnnualFilterYear}>
                    <SelectTrigger className="w-[140px] h-9 text-xs">
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todo o Histórico</SelectItem>
                      {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Total Dízimo {annualSummary.year}</div>
                    <div className="text-lg font-bold text-accent">{currencyFormatter.format(annualSummary.totalYear)}</div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => exportPDF(`Resumo Anual - ${annualSummary.year}`, MONTHS_FULL.map((m, i) => [m, currencyFormatter.format(annualSummary.months[i])]), ["Mês", "Dízimo"], "resumo-anual")}>
                    <FileDown className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead className="text-right">Dízimo Calculado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MONTHS_FULL.map((month, index) => (
                      <TableRow key={month} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-primary">{month}</TableCell>
                        <TableCell className="text-right font-bold text-accent">
                          {currencyFormatter.format(annualSummary.months[index])}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="shadow-md border-border/50 bg-white/50 h-full">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-headline text-lg">Últimos Registros</CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exportPDF("Últimos Registros", filteredRecentEntries.map(e => [format(parseISO(e.entryDate), 'dd/MM/yyyy'), e.description, currencyFormatter.format(e.amount), e.isPaid ? "Sim" : "Não"]), ["Data", "Descrição", "Valor", "Dízimo Devolvido"], "ultimos-registros")}>
                    <FileDown className="h-5 w-5" />
                  </Button>
                </div>
                <Select value={recentFilterMonth} onValueChange={setRecentFilterMonth}>
                  <SelectTrigger className="w-full h-9 text-xs"><SelectValue placeholder="Filtrar por mês" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Meses</SelectItem>
                    {availableMonths.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="space-y-3">
                {isEntriesLoading ? (
                  <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" /></div>
                ) : filteredRecentEntries.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-xs">Nenhum registro encontrado.</div>
                ) : (
                  filteredRecentEntries.map((entry) => (
                    <div key={entry.id} className={cn("flex justify-between items-center p-3 rounded-lg border border-border/40 shadow-sm", entry.isPaid ? "bg-emerald-50" : "bg-white")}>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium truncate text-primary">{entry.description}</span>
                        <span className="text-[10px] text-muted-foreground">{format(parseISO(entry.entryDate), 'dd/MM/yyyy')}</span>
                      </div>
                      <span className="font-bold text-sm whitespace-nowrap ml-2 text-primary">{currencyFormatter.format(entry.amount)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Diálogos de Edição e Exclusão */}
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
