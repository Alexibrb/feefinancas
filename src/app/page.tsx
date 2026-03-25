
"use client";

import { useState } from "react";
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

  if (currentUser) {
    router.push("/dashboard");
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
      <div className="relative hidden lg:block overflow-hidden">
        <div className="absolute inset-0 bg-primary/20 mix-blend-multiply z-10" />
        <Image
          src="https://picsum.photos/seed/church-1/1200/800"
          alt="Ambiente de fé e crescimento"
          fill
          className="object-cover"
          data-ai-hint="church nature"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-12 text-white">
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

      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex flex-col items-center text-center space-y-4 mb-8">
            <Leaf className="text-primary h-12 w-12" />
            <h1 className="text-3xl font-headline font-bold text-primary">Fé & Finanças</h1>
          </div>

          <Card className="shadow-xl border-border/50">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-headline text-center">
                {isRegistering ? "Criar conta" : "Bem-vindo de volta"}
              </CardTitle>
              <CardDescription className="text-center">
                {isRegistering 
                  ? "Comece hoje a organizar sua vida financeira espiritual" 
                  : "Entre com seus dados para acessar seus registros"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegistering && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input 
                      id="name" 
                      placeholder="Seu nome" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required 
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="exemplo@email.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6">
                  {isRegistering ? "Cadastrar" : "Acessar Sistema"}
                </Button>
              </form>
              <div className="mt-6 text-center text-sm">
                <button 
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-primary font-semibold hover:underline"
                >
                  {isRegistering 
                    ? "Já possui uma conta? Entre aqui" 
                    : "Não tem uma conta? Cadastre-se agora"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
