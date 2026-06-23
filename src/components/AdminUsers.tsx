import React, { useState } from 'react';
import { User, SubscriptionPlan } from '../types.ts';
import { Users, UserPlus, Check, AlertCircle, RefreshCw, Ban, ShieldCheck, Calendar, Shield, Trash2 } from 'lucide-react';

interface AdminUsersProps {
  users: User[];
  plans: SubscriptionPlan[];
  onUsersUpdated: (updatedUsers: User[]) => void;
}

export default function AdminUsers({ users, plans, onUsersUpdated }: AdminUsersProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  // User form details
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [planType, setPlanType] = useState<any>('Premium');

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email) {
      setErrorMsg("Please fill both username and email details.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      // Calculate initial expiry: +30 days
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);

      const payload = {
        username,
        email,
        role,
        planType,
        subscriptionStatus: "active",
        subscriptionExpiry: thirtyDays.toISOString(),
      };

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const freshRes = await fetch("/api/users");
        if (freshRes.ok) {
          const freshData = await freshRes.json();
          onUsersUpdated(freshData);
        }
        setSuccessMsg(`User registration "${username}" successfully completed.`);
        setIsAdding(false);
        setUsername("");
        setEmail("");
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to catalog user profile.");
      }
    } catch (e) {
      setErrorMsg("Severe communications error connecting with DB.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (user: User) => {
    try {
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: !user.isBlocked })
      });

      if (res.ok) {
        const fetchRes = await fetch("/api/users");
        if (fetchRes.ok) {
          const freshData = await fetchRes.json();
          onUsersUpdated(freshData);
        }
        setSuccessMsg(`Status of "${user.username}" toggled to ${!user.isBlocked ? 'Blocked' : 'Active'}.`);
      }
    } catch (e) {
      setErrorMsg("Failed to communicate block status to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleExtendSubscription = async (user: User) => {
    try {
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      // Parse current or calculate fresh expiry
      const baseDate = new Date(user.subscriptionExpiry);
      const isPast = baseDate.getTime() < Date.now();
      const newDate = isPast ? new Date() : baseDate;
      newDate.setDate(newDate.getDate() + 30);

      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionExpiry: newDate.toISOString(),
          subscriptionStatus: "active"
        })
      });

      if (res.ok) {
        const fetchRes = await fetch("/api/users");
        if (fetchRes.ok) {
          const freshData = await fetchRes.json();
          onUsersUpdated(freshData);
        }
        setSuccessMsg(`Extended sub for "${user.username}" by 30 days!`);
      }
    } catch (e) {
      setErrorMsg("Severe communications error renewing license key.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (id: string, name: string) => {
    setUserToDelete({ id, name });
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    const { id, name } = userToDelete;

    try {
      setLoading(true);
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        const fetchRes = await fetch("/api/users");
        if (fetchRes.ok) {
          const freshData = await fetchRes.json();
          onUsersUpdated(freshData);
        }
        setSuccessMsg(`User billing profile successfully dismissed.`);
        setUserToDelete(null);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Disposal request denied.");
      }
    } catch (e) {
      setErrorMsg("Failed calling DB discard API.");
    } finally {
      setLoading(false);
    }
  };

  const changeUserPlan = async (user: User, newPlan: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType: newPlan })
      });
      if (res.ok) {
        const fetchRes = await fetch("/api/users");
        if (fetchRes.ok) {
          const freshData = await fetchRes.json();
          onUsersUpdated(freshData);
        }
        setSuccessMsg(`Switched plan for "${user.username}" to ${newPlan}.`);
      }
    } catch (e) {
      setErrorMsg("Fail modifying user package.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6" id="admin-user-billing-panel">
      
      {/* Table header menu */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-100">User accounts & Subscription control</h2>
          <p className="text-xs text-slate-400">Suspend profiles, override plan levels, and extend bill dates</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-xs text-white transition active:scale-95 shadow-md cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Register Client Card
          </button>
        )}
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-950/40 border border-green-800/60 rounded-xl text-green-400 text-xs">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-400 text-xs">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Register Client Card Form */}
      {isAdding && (
        <form onSubmit={handleAddUser} className="glassmorphism p-5 rounded-2xl border border-red-500/15 flex flex-col gap-4 max-w-xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-1">
            <h3 className="font-display font-semibold text-sm text-red-400 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Provision New Profile Channel access
            </h3>
            <button type="button" onClick={() => setIsAdding(false)} className="text-xs text-slate-400 hover:text-white cursor-pointer">
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-300">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. John Doe"
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500 transition"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-300">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. contact@domain.com"
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500 transition"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-300">Default Access Package</label>
              <select
                value={planType}
                onChange={(e) => setPlanType(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500 transition cursor-pointer"
              >
                <option value="Trial">Trial Pack (24 Hours)</option>
                <option value="Basic">Basic Standard (1 Month)</option>
                <option value="Premium">Premium Pro (3 Months)</option>
                <option value="VIP">VIP Elite (Infinite/Admin)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-300">Administrative Role</label>
              <select
                value={role}
                onChange={(e: any) => setRole(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500 transition cursor-pointer"
              >
                <option value="user">Registered Subscriber (User)</option>
                <option value="admin">Platform Operator (Admin)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-800/80 pt-3 mt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 rounded-lg text-xs font-semibold"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-xs font-bold rounded-lg text-white transition shadow active:scale-95"
            >
              {loading ? <RefreshCw className="w-3 animate-spin" /> : "Authorize Profile"}
            </button>
          </div>
        </form>
      )}

      {/* Users table list listing database content */}
      <div className="glassmorphism rounded-2xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4 pl-5">Client Profile</th>
                <th className="p-4">Package Plan</th>
                <th className="p-4">Expiry Date</th>
                <th className="p-4">Status</th>
                <th className="p-4">System Actions Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 bg-slate-900/10">
              {users.map((u) => {
                const expiryObj = new Date(u.subscriptionExpiry);
                const isPast = expiryObj.getTime() < Date.now();
                const displayDate = expiryObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

                return (
                  <tr key={u.id} className={`hover:bg-slate-800/40 transition ${u.isBlocked ? 'opacity-50' : ''}`}>
                    <td className="p-4 pl-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop"}
                          alt={u.username}
                          className="w-9 h-9 object-cover rounded-full border border-slate-700 bg-slate-950"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100">{u.username}</span>
                            {u.role === "admin" && (
                              <span className="bg-red-600/10 text-red-500 border border-red-500/25 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase flex items-center gap-0.5">
                                <Shield className="w-2.5 h-2.5" /> root admin
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      {u.role === "admin" ? (
                        <span className="text-xs font-mono font-bold text-red-400">Unlimited VIP</span>
                      ) : (
                        <select
                          value={u.planType}
                          onChange={(e) => changeUserPlan(u, e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-red-500 transition cursor-pointer"
                        >
                          <option value="Trial">Trial Pass</option>
                          <option value="Basic">Standard</option>
                          <option value="Premium">Pro Premium</option>
                          <option value="VIP">VIP Elite</option>
                        </select>
                      )}
                    </td>

                    <td className="p-4 text-xs font-mono text-slate-300">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-550" />
                        <span className={isPast && u.role !== 'admin' ? 'text-red-400 font-bold' : 'text-slate-300'}>
                          {u.role === "admin" ? "Infinite Lease" : displayDate}
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      {u.isBlocked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-600/10 text-red-500 border border-red-500/20">
                          Blocked Case
                        </span>
                      ) : isPast && u.role !== "admin" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-600/10 text-amber-500 border border-amber-500/20">
                          Expired Pass
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                          Active Pass
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {u.role !== "admin" && (
                          <>
                            {/* Renewal Button */}
                            <button
                              onClick={() => handleExtendSubscription(u)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-slate-950 border border-slate-805 hover:bg-slate-850 hover:border-slate-700 rounded text-slate-300 hover:text-white transition cursor-pointer whitespace-nowrap"
                              title="Override current expiration calendar (+30 Days)"
                            >
                              Renew +30 Days
                            </button>

                            {/* Block Toggle Button */}
                            <button
                              onClick={() => handleToggleBlock(u)}
                              className={`p-1.5 rounded border transition cursor-pointer ${u.isBlocked ? 'bg-green-600/10 border-green-500/20 text-green-400 hover:bg-green-600 hover:text-white' : 'bg-red-600/10 border-red-500/20 text-red-400 hover:bg-red-600 hover:text-white'}`}
                              title={u.isBlocked ? "Revoke Suspension" : "Issue Account Ban"}
                            >
                              {u.isBlocked ? <ShieldCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="p-1.5 rounded border bg-slate-950 border-slate-805 hover:bg-red-950/20 hover:border-red-500/30 text-slate-500 hover:text-red-400 cursor-pointer"
                              title="Delete profile"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {u.role === "admin" && (
                          <span className="text-[10px] italic text-slate-500">Secured System Administrator Card</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* State-driven confirm delete user modal overlay */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="confirm-delete-user-modal">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 p-6 rounded-2xl flex flex-col items-center text-center shadow-2xl relative">
            <div className="w-14 h-14 bg-red-650/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2">Wipe User Profile?</h3>
            <p className="text-sm text-slate-350 leading-relaxed mb-6">
              Are you absolutely sure you want to completely wipe user card <span className="text-red-400 font-semibold">"{userToDelete.name}"</span>? This action is irreversible.
            </p>
            <div className="flex gap-3 w-full justify-center">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs transition duration-200 cursor-pointer w-28"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition duration-200 shadow active:scale-95 cursor-pointer w-28"
              >
                {loading ? <RefreshCw className="w-3 animate-spin mx-auto" /> : "Yes, Purge"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
