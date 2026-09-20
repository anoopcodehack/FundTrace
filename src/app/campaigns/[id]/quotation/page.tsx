"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import { getFundTraceContract } from "@/lib/contract";
import { createQuotation } from "@/services/quotationService";
import { toast } from "sonner";
import { ethers } from "ethers";
import { QuotationState } from "@/types";
import { CheckCircle2, XCircle, AlertTriangle, FileText, Bot } from "lucide-react";

interface LineItem {
  description: string;
  quantity: number;
  unitPriceFtu: number;
  totalFtu: number;
}

export default function QuotationPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = Number(params?.id || 0);
  const { wallet, signer } = useWallet();

  const [purpose, setPurpose] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorContact, setVendorContact] = useState("");
  const [requestedAmountFtu, setRequestedAmountFtu] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPriceFtu: 0, totalFtu: 0 },
  ]);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const totalFromItems = items.reduce((sum, i) => sum + i.totalFtu, 0);

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "quantity" || field === "unitPriceFtu") {
        updated[index].totalFtu = updated[index].quantity * updated[index].unitPriceFtu;
      }
      return updated;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unitPriceFtu: 0, totalFtu: 0 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.isConnected || !signer) {
      toast.error("Connect your wallet first");
      return;
    }
    if (!purpose.trim() || !vendorName.trim()) {
      toast.error("Fill in all required fields");
      return;
    }
    const amount = Number(requestedAmountFtu) || totalFromItems;
    if (amount <= 0) {
      toast.error("Requested amount must be greater than 0");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Uploading quotation & running AI evaluation...");

    try {
      // 1. Send to NestJS for AI evaluation + Supabase storage
      const { quotation, aiRecommendation, quotationHash } = await createQuotation({
        campaignId,
        creatorAddress: wallet.address!,
        purpose,
        vendorName,
        vendorContact,
        requestedAmountFtu: amount,
        items,
        file: file || undefined,
      });

      toast.loading("Registering quotation on blockchain...", { id: toastId });

      // 2. Register on-chain (creator signs)
      const contract = getFundTraceContract(signer);
      const amountWei = BigInt(Math.floor(amount));
      const quotationHashBytes = quotationHash.startsWith("0x")
        ? quotationHash
        : "0x" + quotationHash;

      const tx = await contract.registerQuotation(campaignId, amountWei, quotationHashBytes);
      await tx.wait();

      toast.success("Quotation submitted! Awaiting donor review.", { id: toastId });
      setResult({ quotation, aiRecommendation });
    } catch (err: any) {
      toast.error(err.message || "Submission failed", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    const rec = result.aiRecommendation;
    const recColor = rec.recommendation === "APPROVE"
      ? "emerald" : rec.recommendation === "REJECT" ? "red" : "amber";

    return (
      <div className="min-h-screen bg-[#F7F4ED] pb-24">        <main className="max-w-3xl mx-auto px-6 pt-8">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-lg p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl bg-${recColor}-100 flex items-center justify-center`}>
                {rec.recommendation === "APPROVE" ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : rec.recommendation === "REJECT" ? <XCircle className="w-6 h-6 text-red-600" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
              </div>
              <div>
                <h2 className="text-xl font-black text-stone-900">Quotation Submitted</h2>
                <p className="text-sm text-stone-500">AI evaluation complete · Awaiting donor review</p>
              </div>
            </div>

            {/* AI Recommendation Card */}
            <div className={`p-6 rounded-2xl border-2 border-${recColor}-200 bg-${recColor}-50`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-mono font-bold uppercase tracking-wider text-${recColor}-700`}>
                  AI RECOMMENDATION
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold bg-${recColor}-100 text-${recColor}-800`}>
                  {rec.recommendation} · {Math.round(rec.confidence * 100)}% confidence
                </span>
              </div>
              <p className="text-sm text-stone-700 leading-relaxed mb-3">{rec.reason}</p>
              {rec.flags.length > 0 && (
                <div className="space-y-1">
                  {rec.flags.map((f: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-stone-600">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold bg-${recColor}-200 text-${recColor}-900`}>
                  Risk: {rec.riskLevel}
                </span>
                <span className="text-xs text-stone-400">
                  This is an AI recommendation. Donors make the final decision.
                </span>
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="text-sm text-stone-500 mb-4">
                Your quotation is now visible to campaign donors for review and sanction.
              </p>
              <Link
                href={`/campaigns/${campaignId}`}
                className="inline-block px-6 py-3 bg-[#181816] text-white font-bold text-sm rounded-xl hover:bg-black transition-colors"
              >
                ← Back to Campaign
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4ED] pb-24">      <main className="max-w-3xl mx-auto px-6 pt-8">

        {/* Header */}
        <div className="flex items-center gap-2 text-xs font-bold text-stone-500 mb-6 uppercase tracking-wider">
          <Link href="/campaigns" className="hover:text-[#FF5023]">Campaigns</Link>
          <span>/</span>
          <Link href={`/campaigns/${campaignId}`} className="hover:text-[#FF5023]">Campaign #{campaignId}</Link>
          <span>/</span>
          <span className="text-stone-900">Submit Quotation</span>
        </div>

        <div className="bg-[#161813] text-white rounded-3xl p-8 mb-8 border border-stone-800">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-mono font-medium border border-white/10">
              Creator Action Required
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-stone-300 text-xs font-mono font-medium border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              AI Evaluated
            </span>
          </div>
          <h1 className="text-4xl font-black uppercase font-bebas leading-tight tracking-tight mt-2">
            Submit Spending Quotation
          </h1>
          <p className="text-sm text-stone-400 mt-2 leading-relaxed">
            Upload your quotation document and provide item details. The AI will evaluate your request and donors will review the recommendation before sanctioning funds.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Purpose */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Request Details</h2>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                Purpose *
              </label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
                rows={3}
                placeholder="What are these funds needed for? Be specific."
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#FF5023]/30 focus:border-[#FF5023] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Vendor Name *
                </label>
                <input
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  required
                  placeholder="Supplier / Vendor Name"
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#FF5023]/30 focus:border-[#FF5023]"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Vendor Contact
                </label>
                <input
                  value={vendorContact}
                  onChange={(e) => setVendorContact(e.target.value)}
                  placeholder="Phone / Email (optional)"
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#FF5023]/30 focus:border-[#FF5023]"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Itemized Breakdown</h2>
              <button
                type="button"
                onClick={addItem}
                className="text-xs font-bold text-[#FF5023] hover:underline"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className="col-span-5 border border-stone-200 rounded-lg px-3 py-2 text-xs bg-stone-50 focus:outline-none focus:border-[#FF5023]"
                    placeholder="Item description"
                    value={item.description}
                    onChange={(e) => updateItem(i, "description", e.target.value)}
                  />
                  <input
                    type="number"
                    className="col-span-2 border border-stone-200 rounded-lg px-3 py-2 text-xs bg-stone-50 focus:outline-none focus:border-[#FF5023]"
                    placeholder="Qty"
                    value={item.quantity}
                    min={1}
                    onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                  />
                  <input
                    type="number"
                    className="col-span-2 border border-stone-200 rounded-lg px-3 py-2 text-xs bg-stone-50 focus:outline-none focus:border-[#FF5023]"
                    placeholder="₹/unit"
                    value={item.unitPriceFtu}
                    min={0}
                    onChange={(e) => updateItem(i, "unitPriceFtu", Number(e.target.value))}
                  />
                  <div className="col-span-2 text-xs font-mono font-bold text-stone-700 text-right">
                    ₹{item.totalFtu.toLocaleString()}
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="col-span-1 text-red-400 hover:text-red-600 text-center"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500">Items Total</span>
              <span className="text-2xl font-black font-bebas text-stone-900 tracking-wide">
                ₹{totalFromItems.toLocaleString()} <span className="text-base text-stone-500">FTU</span>
              </span>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                Override Total Amount (FTU) — leave blank to use items total
              </label>
              <input
                type="number"
                value={requestedAmountFtu}
                onChange={(e) => setRequestedAmountFtu(e.target.value)}
                placeholder={`${totalFromItems} FTU (auto-calculated)`}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#FF5023]/30 focus:border-[#FF5023]"
              />
            </div>
          </div>

          {/* Quotation Document Upload */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Quotation Document</h2>
            <p className="text-xs text-stone-500 leading-relaxed">
              Upload the official quotation document from the vendor (PDF, JPG, PNG). Its cryptographic hash will be stored on-chain.
            </p>
            <label className="block cursor-pointer">
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                file ? "border-emerald-300 bg-emerald-50" : "border-stone-300 hover:border-[#FF5023] bg-stone-50"
              }`}>
                {file ? (
                  <div>
                    <p className="text-sm font-bold text-emerald-700">{file.name}</p>
                    <p className="text-xs text-emerald-600 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <FileText className="w-8 h-8 mx-auto text-stone-400 mb-2" />
                    <p className="text-sm font-medium text-stone-600">Drop quotation file here or click to upload</p>
                    <p className="text-xs text-stone-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          {/* AI Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Bot className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-900">AI Evaluation</p>
                <p className="text-xs text-blue-700 leading-relaxed mt-1">
                  Upon submission, our AI will analyze your quotation against campaign objectives, your reliability score, and historical data. The recommendation (APPROVE/REJECT/REVIEW) will be shown to campaign donors. <strong>Donors make the final decision.</strong>
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !wallet.isConnected}
            className="w-full py-4 px-6 rounded-2xl bg-[#FF5023] hover:bg-[#e8431a] text-white font-black text-sm uppercase tracking-wider transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting & Evaluating..." : "Submit Quotation for AI Review →"}
          </button>

          {!wallet.isConnected && (
            <p className="text-center text-xs text-red-500 font-medium">
              Connect your MetaMask wallet to submit a quotation
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
