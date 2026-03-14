import React from 'react';
import { format } from 'date-fns';
import { Project, Client, Payment, Installment } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InvoiceTemplateProps {
  project: Project;
  client: Client;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
  notes: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
}

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({
  project,
  client,
  invoiceNumber,
  totalAmount,
  paidAmount,
  dueDate,
  notes,
  bankDetails
}) => {
  return (
    <div id="invoice-template" className="bg-[#0a0a0a] p-10 w-[600px] text-white font-sans">
      <div className="bg-[#0f172a] p-10 rounded-t-3xl flex flex-col items-center text-center border-b border-white/5">
        <div className="w-16 h-16 bg-[#10b981] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
          <span className="text-3xl font-black text-white">T</span>
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Truth Arc Media</h1>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-2">Digital Marketing Agency</p>
      </div>

      <div className="p-10 bg-[#111111] rounded-b-3xl border-x border-b border-white/5 shadow-2xl">
        <div className="flex justify-between items-center mb-10">
          <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Invoice Number</p>
            <p className="text-sm font-mono font-bold text-white">{invoiceNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Due Date</p>
            <p className="text-sm font-bold text-rose-500">{format(new Date(dueDate), 'MMM dd, yyyy')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-12">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Client Details</p>
            <p className="text-base font-bold text-white">{client.company || client.name}</p>
            <p className="text-xs text-slate-400 mt-1">{client.contactPerson}</p>
            <p className="text-xs text-slate-400">{client.email}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Project</p>
            <p className="text-base font-bold text-white">{project.title}</p>
            <p className="text-xs text-slate-400 mt-1">{project.serviceType}</p>
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden mb-10">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5">
                <th className="p-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</th>
                <th className="p-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-6">
                  <p className="text-sm font-bold text-white">{project.title}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{project.serviceType}</p>
                </td>
                <td className="p-6 text-right text-base font-black text-white">
                  Rs. {totalAmount.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-12">
          <div className="w-72 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Total Budget:</span>
              <span className="font-bold text-white">Rs. {totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Paid to Date:</span>
              <span className="font-bold text-emerald-500">Rs. {paidAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-white/10">
              <span className="text-base font-bold text-white">Balance Due:</span>
              <span className="text-2xl font-black text-indigo-500">Rs. {(totalAmount - paidAmount).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/5">
          <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.2em] mb-6 text-center">Payment Instructions</h3>
          <div className="grid grid-cols-2 gap-y-6 gap-x-8">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Bank Name</p>
              <p className="text-sm font-bold text-white">{bankDetails.bankName}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Account Number</p>
              <p className="text-sm font-bold text-white font-mono">{bankDetails.accountNumber}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Account Name</p>
              <p className="text-sm font-bold text-white">{bankDetails.accountName}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Status</p>
              <span className="text-[10px] font-black uppercase bg-rose-500/20 text-rose-500 px-2 py-1 rounded">Pending</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 text-center">
          <p className="text-sm font-bold text-white">We appreciate your prompt payment.</p>
          <p className="text-[10px] text-slate-500 mt-2 tracking-widest uppercase">© 2026 Truth Arc Media • Digital Marketing Agency</p>
        </div>
      </div>
    </div>
  );
};

interface ReceiptTemplateProps {
  project: Project;
  client: Client;
  invoiceNumber: string;
  installment: Installment;
  totalPaid: number;
  remainingBalance: number;
  allInstallments?: Installment[];
}

export const ReceiptTemplate: React.FC<ReceiptTemplateProps> = ({
  project,
  client,
  invoiceNumber,
  installment,
  totalPaid,
  remainingBalance,
  allInstallments = []
}) => {
  return (
    <div id="receipt-template" className="bg-[#0a0a0a] p-10 w-[600px] text-white font-sans">
      <div className="bg-[#10b981] p-10 rounded-t-3xl flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-xl">
          <span className="text-3xl font-black text-[#10b981]">T</span>
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Truth Arc Media</h1>
        <p className="text-emerald-100 text-xs font-bold uppercase tracking-[0.2em] mt-2">Payment Confirmation</p>
      </div>

      <div className="p-10 bg-[#111111] rounded-b-3xl border-x border-b border-white/5 shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-block bg-emerald-500/10 border border-emerald-500/20 px-4 py-1 rounded-full mb-4">
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Payment Received</span>
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Thank You for Your Payment</h2>
          <p className="text-slate-400 text-sm">Hello <span className="text-white font-bold">{client.contactPerson}</span>,</p>
          <p className="text-slate-400 text-sm mt-1">This is a confirmation that we have received your payment for <span className="text-white font-bold">{project.title}</span>.</p>
        </div>

        <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/5 mb-10">
          <div className="grid grid-cols-2 gap-y-6 gap-x-8">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Receipt Number</p>
              <p className="text-sm font-bold text-white font-mono">{invoiceNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Date Received</p>
              <p className="text-sm font-bold text-white">{format(new Date(installment.date), 'MMM dd, yyyy')}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Installment</p>
              <p className="text-sm font-bold text-indigo-400">{installment.note || 'Payment'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Method</p>
              <p className="text-sm font-bold text-white">{installment.paymentMethod}</p>
            </div>
            <div className="col-span-2 border-t border-white/5 pt-6 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-400">Total Invoice</span>
              <span className="text-base font-black text-white">Rs. {(totalPaid + remainingBalance).toLocaleString()}</span>
            </div>
            <div className="col-span-2 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-400">Payment Already Paid</span>
              <span className="text-base font-bold text-white">Rs. {(totalPaid - installment.amount).toLocaleString()}</span>
            </div>
            <div className="col-span-2 flex justify-between items-center">
              <span className="text-sm font-bold text-emerald-500">Amount Paid Now</span>
              <span className="text-xl font-black text-emerald-500">Rs. {installment.amount.toLocaleString()}</span>
            </div>
            <div className="col-span-2 border-t border-white/5 pt-6 flex justify-between items-center">
              <span className="text-base font-bold text-white">Remaining Payment</span>
              <span className="text-xl font-black text-rose-500">Rs. {remainingBalance.toLocaleString()}</span>
            </div>
            <div className="col-span-2 border-t border-white/5 pt-6 flex justify-between items-center">
              <span className="text-base font-bold text-white">Status</span>
              <span className={cn(
                "text-base font-black uppercase",
                remainingBalance <= 0 ? "text-emerald-500" : "text-amber-500"
              )}>
                {remainingBalance <= 0 ? 'Paid in Full' : 'Partially Paid'}
              </span>
            </div>
          </div>
        </div>

        {allInstallments.length > 0 && (
          <div className="mb-10">
            <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.2em] mb-4">Payment History</h3>
            <div className="bg-[#1a1a1a] rounded-xl border border-white/5 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white/5">
                    <th className="p-3 text-left text-slate-500 font-bold uppercase">Date</th>
                    <th className="p-3 text-right text-slate-500 font-bold uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allInstallments.map((inst, idx) => (
                    <tr key={idx}>
                      <td className="p-3 text-slate-300">{format(new Date(inst.date), 'MMM dd, yyyy')}</td>
                      <td className="p-3 text-right font-bold text-white">Rs. {inst.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-white/5 text-center">
          <p className="text-sm font-bold text-white">We appreciate your prompt payment.</p>
          <p className="text-[10px] text-slate-500 mt-2 tracking-widest uppercase">© 2026 Truth Arc Media • Digital Marketing Agency</p>
        </div>
      </div>
    </div>
  );
};
