"use client";

import React, { useState, useEffect } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { formatAddress } from '@/lib/wallet';
import Link from 'next/link';
import { ChevronRight, Shield, User, Star, RefreshCw, Loader2, Award } from 'lucide-react';

interface SupabaseUser {
  id: string;
  wallet_address: string;
  role: 'ADMIN' | 'CREATOR' | 'DONOR' | 'VERIFIER' | 'BENEFICIARY';
  name?: string;
  bio?: string;
  avatar_url?: string;
  created_at?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<SupabaseUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let res = await fetch("/api/users");
      if (!res.ok) {
        res = await fetch("http://localhost:3001/api/users");
      }
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to load users from Supabase:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="min-h-screen p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/admin" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Admin</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">Users</span>
              </div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">User Management</h1>
              <p className="text-stone-600 font-medium mt-2">All platform participants fetched directly from Supabase Database.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={fetchUsers}
                disabled={isLoading}
                className="px-4 py-2 bg-white border border-stone-200 text-stone-700 font-bold rounded-lg hover:bg-stone-50 transition-colors shadow-sm flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </header>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-stone-50/50 border-b border-stone-200 flex justify-between items-center">
              <span className="text-xs uppercase font-bold text-stone-500 tracking-wider">
                Total Registered Personas in Supabase: {users.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-stone-400 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  <p className="text-sm font-medium">Loading platform personas from Supabase...</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50/50 border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500 font-bold">
                      <th className="p-4 whitespace-nowrap">User Persona</th>
                      <th className="p-4 whitespace-nowrap">Role</th>
                      <th className="p-4 whitespace-nowrap">Wallet Address</th>
                      <th className="p-4 whitespace-nowrap text-center">Score / Status</th>
                      <th className="p-4 whitespace-nowrap text-center">Database ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {users.map((user, idx) => {
                      const isCreator = user.role === 'CREATOR';
                      const score = isCreator ? 78 : null;
                      
                      return (
                        <tr key={user.id || idx} className="hover:bg-stone-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {user.avatar_url ? (
                                <img 
                                  src={user.avatar_url} 
                                  alt={user.name || 'User'} 
                                  className="w-10 h-10 rounded-full border border-stone-200 bg-stone-100 flex-shrink-0"
                                />
                              ) : (
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  isCreator ? 'bg-indigo-100 text-indigo-600' : 'bg-stone-100 text-stone-500'
                                }`}>
                                  {user.role === 'ADMIN' ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-stone-900 text-sm">{user.name || `User #${user.id}`}</p>
                                <p className="text-xs text-stone-500 max-w-xs truncate">{user.bio || 'Platform participant'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                              user.role === 'ADMIN' ? 'bg-red-100 text-red-800' : 
                              user.role === 'CREATOR' ? 'bg-indigo-100 text-indigo-800' : 
                              user.role === 'VERIFIER' ? 'bg-amber-100 text-amber-800' :
                              user.role === 'DONOR' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm font-mono text-stone-600 bg-stone-100 px-2 py-1 rounded">
                              {formatAddress(user.wallet_address)}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {isCreator ? (
                              <div className="flex flex-col items-center">
                                <span className="flex items-center gap-1 text-sm font-bold text-emerald-700">
                                  <Star className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                                  {score}/100
                                </span>
                                <span className="text-xs text-stone-500 mt-0.5">Reliability Score</span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <span className="text-xs font-mono text-stone-400">
                              {String(user.id).slice(0, 8)}...
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {!isLoading && users.length === 0 && (
                <div className="text-center py-12 text-stone-500 font-medium">
                  No users found in Supabase public.users table.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
