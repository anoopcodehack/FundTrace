"use client";

import React from 'react';
import RoleGuard from '@/components/RoleGuard';
import { DEMO_PRESET_ACCOUNTS, formatAddress } from '@/lib/wallet';
import { MOCK_CREATOR_SCORE } from '@/lib/mock';
import Link from 'next/link';
import { ChevronRight, Shield, User, Star } from 'lucide-react';

export default function AdminUsersPage() {
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
              <p className="text-stone-600 font-medium mt-2">Monitor all platform participants and creator reliability scores.</p>
            </div>
          </header>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50/50 border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500 font-bold">
                    <th className="p-4 whitespace-nowrap">User</th>
                    <th className="p-4 whitespace-nowrap">Role</th>
                    <th className="p-4 whitespace-nowrap">Wallet Address</th>
                    <th className="p-4 whitespace-nowrap text-center">Score / Stats</th>
                    <th className="p-4 whitespace-nowrap text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {DEMO_PRESET_ACCOUNTS.map((user, idx) => {
                    const isCreator = user.appRole === 'CREATOR';
                    const score = isCreator ? MOCK_CREATOR_SCORE.currentScore : null;
                    
                    return (
                      <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isCreator ? 'bg-indigo-100 text-indigo-600' : 'bg-stone-100 text-stone-500'}`}>
                              {user.appRole === 'ADMIN' ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="font-bold text-stone-900 text-sm">{user.role}</p>
                              <p className="text-xs text-stone-500">{user.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                            user.appRole === 'ADMIN' ? 'bg-red-100 text-red-800' : 
                            user.appRole === 'CREATOR' ? 'bg-indigo-100 text-indigo-800' : 
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {user.appRole}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-mono text-stone-600 bg-stone-100 px-2 py-1 rounded">
                            {formatAddress(user.address)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {isCreator ? (
                            <div className="flex flex-col items-center">
                              <span className="flex items-center gap-1 text-sm font-bold text-emerald-700">
                                <Star className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                                {score}/100
                              </span>
                              <span className="text-xs text-stone-500 mt-1">Reliability Score</span>
                            </div>
                          ) : (
                            <span className="text-stone-400 text-xs font-medium italic">N/A</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button className="text-xs font-bold bg-white border border-stone-200 text-stone-600 px-3 py-1.5 rounded-md hover:bg-stone-50 transition-colors shadow-sm">
                            View Profile
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
