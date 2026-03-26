
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf } from "lucide-react";
import Image from "next/image";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const { login, currentUser } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (currentUser) {
      router.push("/dashboard");
    }
  }, [currentUser, router]);

  if (currentUser) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    login(email, isRegistering ? name : "Usuário");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Lado Esquerdo - Hero (Escondido em Mobile) */}
      <div className="relative hidden lg:block overflow-hidden">
        <div className="absolute inset-0 bg-primary/20 mix-blend-multiply z-10" />
        <Image
          src="https://picsum.photos/seed/church-1/1200/800"
          alt="Ambiente de fé e crescimento"
          fill
          className="object-cover"
          data-ai-hint="church nature"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-12 text-white bg-gradient-to-t from-primary/80 to-transparent">
          <div className="flex items-center gap-2 mb-4">
            <Leaf className="text-secondary h-12 w-12" />
            <h1 className="text-5xl font-headline font-bold">Fé & Finanças</h1>
          </div>
          <p className="text-xl max-w-lg opacity-90 leading-relaxed font-light">
            Sua jornada de fidelidade começa com uma gestão consciente. 
            Organize seus dízimos, acompanhe sua generosidade e reflita sobre sua mordomia.
          </p>
        </div>
      </div>

      {/* Lado Direito - Form de Login/Cadastro */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-background relative">
        {/* Background Decorativo Mobile */}
        <div className="lg:hidden absolute inset-0 -z-10 opacity-5 pointer-events-none">
          <Image
            src="https://picsum.photos/seed/finance-growth/600/400"
            alt="Growth background"
            fill
            className="object-cover"
            data-ai-hint="nature pattern"
          />
        </div>

        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex flex-col items-center text-center space-y-4 mb-8">
            <div className="bg-primary/10 p-4 rounded-full">
              <Leaf className="text-primary h-10 w-10" />
            </div>
            <h1 className="text-3xl font-headline font-bold text-primary">Fé & Finanças</h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Organize seus dízimos e acompanhe sua fidelidade de forma simples e segura.
            </p>
          </div>

          <Card className="shadow-2xl border-border/40 bg-white/95 backdrop-blur-sm">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl font-headline text-center">
                {isRegistering ? "Criar conta" : "Bem-vindo de volta"}
              </CardTitle>
              <CardDescription className="text-center text-xs sm:text-sm">
                {isRegistering 
                  ? "Comece hoje a organizar sua vida financeira espiritual" 
                  : "Entre com seus dados para acessar seus registros"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegistering && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs uppercase tracking-wider font-bold opacity-70">Nome Completo</Label>
                    <Input 
                      id="name" 
                      placeholder="Como podemos te chamar?" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="py-5"
                      required 
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs uppercase tracking-wider font-bold opacity-70">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="seu@email.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="py-5"
                    required 
                  />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 text-base shadow-lg transition-all active:scale-[0.98] mt-4">
                  {isRegistering ? "Começar Agora" : "Acessar Sistema"}
                </Button>
              </form>
              <div className="mt-8 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {isRegistering ? "Já faz parte da jornada?" : "Ainda não tem conta?"}
                </p>
                <button 
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-primary font-bold hover:underline decoration-2 underline-offset-4"
                >
                  {isRegistering 
                    ? "Faça login aqui" 
                    : "Cadastre-se gratuitamente"}
                </button>
              </div>
            </CardContent>
          </Card>
          
          <div className="text-center mt-12">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">
              Gerencie seus recursos com fé e propósito
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
