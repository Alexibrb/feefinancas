
"use client";

import { useState, useEffect } from 'react';

export interface IncomeEntry {
  id: string;
  amount: number;
  date: string;
  description: string;
  userId: string;
  isPaid: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

const STORAGE_KEY = 'fe_financas_data';

export function useAppStore() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const { user, entries } = JSON.parse(stored);
      setCurrentUser(user);
      setEntries(entries || []);
    }
    const sessionUser = sessionStorage.getItem('current_user');
    if (sessionUser) {
      setCurrentUser(JSON.parse(sessionUser));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: currentUser, entries }));
    }
  }, [currentUser, entries, isLoaded]);

  const login = (email: string, name: string) => {
    const user = { id: email, name, email };
    setCurrentUser(user);
    sessionStorage.setItem('current_user', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('current_user');
  };

  const addEntry = (amount: number, description: string, date: string) => {
    if (!currentUser) return;
    const newEntry: IncomeEntry = {
      id: Math.random().toString(36).substring(7),
      amount,
      description,
      date,
      userId: currentUser.id,
      isPaid: false
    };
    setEntries(prev => [newEntry, ...prev]);
  };

  const updateEntry = (id: string, amount: number, description: string, date: string) => {
    setEntries(prev => prev.map(entry => 
      entry.id === id && !entry.isPaid ? { ...entry, amount, description, date } : entry
    ));
  };

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id || entry.isPaid));
  };

  const togglePaidStatus = (id: string) => {
    setEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, isPaid: !entry.isPaid } : entry
    ));
  };

  const markMonthAsPaid = (yearMonth: string) => {
    setEntries(prev => prev.map(entry => {
      if (entry.date.startsWith(yearMonth)) {
        return { ...entry, isPaid: true };
      }
      return entry;
    }));
  };

  const userEntries = entries.filter(e => e.userId === currentUser?.id);

  return {
    currentUser,
    entries: userEntries,
    login,
    logout,
    addEntry,
    updateEntry,
    deleteEntry,
    togglePaidStatus,
    markMonthAsPaid,
    isLoaded
  };
}
