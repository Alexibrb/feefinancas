
"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Sparkles, BookOpen, Quote, Loader2, RefreshCcw } from "lucide-react";
import { stewardshipReflection, StewardshipReflectionOutput } from "@/ai/flows/stewardship-reflection-flow";
import { startOfMonth, endOfMonth, isWithinInterval, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ReflectionPage() {
  const { entries, currentUser, isLoaded } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [reflection, setReflection] = useState<StewardshipReflectionOutput | null>(null);

  if (!isLoaded || !currentUser) return null;

  const handleGenerateReflection = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const monthEntries = entries.filter(e => isWithinInterval(new Date(e.date), { start, end }));
      const totalIncome = monthEntries.reduce((s, e) => s + e.amount, 0);
      const titheAmount = totalIncome * 0.1;
      
      const result = await stewardshipReflection({
        totalIncome,
        titheAmount,
        monthlyEntriesCount: monthEntries.length,
        reflectionPeriod: format(now, 'MMMM yyyy', { locale: ptBR })
      });
      
      setReflection(result);
    } catch (error) {
      console.error("Erro ao gerar reflexão:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-secondary/20 rounded-full mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-headline font-bold text-primary mb-4">Reflexão de Mordomia</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Use nossa ferramenta de IA para receber percepções bíblicas e perguntas reflexivas personalizadas com base em sua jornada financeira deste mês.
          </p>
        </header>

        {!reflection && !loading ? (
          <Card className="border-none shadow-xl bg-white p-8 text-center">
            <CardHeader>
              <CardTitle className="text-2xl font-headline">Pronto para refletir?</CardTitle>
              <CardDescription>
                Analisaremos seus dados deste mês para gerar uma mensagem inspiradora.
              </CardDescription>
            </CardHeader>
            <CardContent className="py-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="font-headline font-bold text-xl text-primary">R$ {entries.length > 0 ? entries[0].amount.toFixed(2) : "0.00"}</div>
                  <div className="text-sm text-muted-foreground">Exemplo de Entrada</div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="font-headline font-bold text-xl text-primary">{entries.length}</div>
                  <div className="text-sm text-muted-foreground">Total de Registros</div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="font-headline font-bold text-xl text-primary">10%</div>
                  <div className="text-sm text-muted-foreground">Base de Cálculo</div>
                </div>
              </div>
              <Button 
                onClick={handleGenerateReflection} 
                className="w-full md:w-auto px-12 py-7 text-lg bg-primary hover:bg-primary/90 text-white gap-2"
              >
                Gerar Reflexão Personalizada
                <Sparkles className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        ) : loading ? (
          <Card className="border-none shadow-xl bg-white p-20 text-center">
            <div className="flex flex-col items-center gap-6">
              <Loader2 className="h-12 w-12 text-accent animate-spin" />
              <div className="space-y-2">
                <h3 className="text-xl font-headline font-bold text-primary">Buscando sabedoria...</h3>
                <p className="text-muted-foreground">Conectando sua jornada financeira com princípios de mordomia.</p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Card className="border-none shadow-xl bg-white overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-primary to-secondary" />
              <CardHeader className="pt-8 px-8">
                <div className="flex items-center gap-2 text-primary font-semibold mb-2">
                  <Quote className="h-5 w-5" />
                  <span>PERGUNTA PARA REFLEXÃO</span>
                </div>
                <CardTitle className="text-2xl font-headline leading-snug">
                  {reflection?.reflectivePrompt}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <div className="mt-8 pt-8 border-t border-border">
                  <div className="flex items-center gap-2 text-primary font-semibold mb-6">
                    <BookOpen className="h-5 w-5" />
                    <span>PERCEPÇÕES ESCRITURÍSTICAS</span>
                  </div>
                  <div className="grid gap-6">
                    {reflection?.scripturalInsights.map((insight, idx) => (
                      <div key={idx} className="bg-muted/30 p-6 rounded-xl relative overflow-hidden group hover:bg-muted/50 transition-colors">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary opacity-50" />
                        <p className="text-lg leading-relaxed text-foreground italic">
                          "{insight}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/10 p-6 flex justify-center">
                <Button variant="outline" onClick={handleGenerateReflection} className="gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  Gerar nova reflexão
                </Button>
              </CardFooter>
            </Card>
            
            <div className="text-center text-muted-foreground text-sm">
              Esta reflexão é gerada por inteligência artificial com fins devocionais.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
