"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Leaf, LayoutDashboard, History, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (!user) return null;

  const navItems = [
    { label: "Painel", href: "/dashboard", icon: LayoutDashboard },
    { label: "Histórico", href: "/history", icon: History },
  ];

  return (
    <nav className="bg-white border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2 text-primary font-headline font-bold text-xl">
              <Leaf className="text-secondary h-6 w-6" />
              <span className="hidden sm:inline">Fé & Finanças</span>
            </Link>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      pathname === item.href ? "text-primary bg-muted" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden md:inline">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
