/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, Filter, Download, 
  CheckCircle2, Clock, AlertCircle, 
  MoreVertical, Eye, Send, Trash2, X, Loader2,
  TrendingUp, Wallet, Receipt, DollarSign,
  ArrowUpRight, ArrowDownRight,
  CreditCard, Calendar, User, MessageSquare, Smartphone
} from 'lucide-react';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { cn } from '../components/UI';
import { Payment, Installment, Project } from '../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { toPng } from 'html-to-image';
import { InvoiceTemplate, ReceiptTemplate } from '../components/InvoiceTemplate';

export const Payments: React.FC = () => {
  const { 
    payments, projects, clients, 
    updatePayment, deletePayment, 
    syncing, sendReceipt, sendInvoice
  } = useApp();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'billing' | 'registration'>('billing');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [isViewInvoiceModalOpen, setIsViewInvoiceModalOpen] = useState(false);
  const [isSendBillModalOpen, setIsSendBillModalOpen] = useState(false);
  const [billDueDate, setBillDueDate] = useState(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [billNotes, setBillNotes] = useState('');
  const [billAmount, setBillAmount] = useState<number>(0);
  const [billDiscount, setBillDiscount] = useState<number>(0);
  const [billTax, setBillTax] = useState<number>(0);

  // Bank Details State
  const [bankName, setBankName] = useState('JazzCash');
  const [accountNumber, setAccountNumber] = useState('03288903232');
  const [accountName, setAccountName] = useState('Nazia Rasheed');

  // Image Generation Refs
  const invoiceRef = React.useRef<HTMLDivElement>(null);
  const receiptRef = React.useRef<HTMLDivElement>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<string | null>(null);
  const [whatsappReceiptData, setWhatsappReceiptData] = useState<{
    payment: Payment;
    installment: Installment;
    installmentIndex: number;
    manualInstallment?: Installment;
  } | null>(null);

  // New Installment State
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentNote, setInstallmentNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Installment['paymentMethod']>('Bank Transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  // Billing Tab Data: Projects that need billing or have been billed
  const billingData = useMemo(() => {
    return projects.map(project => {
      const invoice = payments.find(p => p.projectId === project.id);
      return {
        project,
        invoice,
        client: clients.find(c => c.id === project.clientId),
        status: invoice ? 'Bill Sent' : 'Not Sent'
      };
    }).filter(item => {
      const searchStr = `${item.project.title} ${item.client?.name || ''}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All Status' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, payments, clients, searchTerm, statusFilter]);

  // Registration Tab Data: Only sent invoices
  const registrationData = useMemo(() => {
    return payments.filter(p => p.isSent).map(payment => {
      const project = projects.find(proj => proj.id === payment.projectId);
      const client = clients.find(c => c.id === payment.clientId);
      return { payment, project, client };
    }).filter(item => {
      const searchStr = `${item.payment.invoiceNumber} ${item.project?.title || ''} ${item.client?.name || ''}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All Status' || item.payment.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [payments, projects, clients, searchTerm, statusFilter]);

  // Billing Dashboard Stats
  const billingStats = useMemo(() => {
    const totalGenerated = projects.length;
    const sent = payments.filter(p => p.isSent).length;
    const pending = totalGenerated - sent;
    const totalAmount = projects.reduce((sum, p) => sum + p.budget, 0);
    return { totalGenerated, sent, pending, totalAmount };
  }, [projects, payments]);

  // Registration Dashboard Stats
  const registrationStats = useMemo(() => {
    const totalExpected = payments.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalCollected = payments.reduce((sum, p) => sum + p.paidAmount, 0);
    const outstanding = totalExpected - totalCollected;
    const progress = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
    const overdueCount = payments.filter(p => p.status === 'Overdue' || (new Date(p.dueDate) < new Date() && p.status !== 'Fully Paid')).length;
    return { totalExpected, totalCollected, outstanding, progress, overdueCount };
  }, [payments]);

  const handleSendBill = async () => {
    if (!selectedProject) return;
    const finalAmount = billAmount - billDiscount + billTax;
    const client = clients.find(c => c.id === selectedProject.clientId);
    
    try {
      setIsGeneratingImage(true);
      
      // 1. Generate Invoice Record
      const result = await sendInvoice(selectedProject.id, {
        totalAmount: finalAmount,
        dueDate: new Date(billDueDate).toISOString(),
        notes: billNotes,
        bankDetails: {
          bankName,
          accountNumber,
          accountName
        }
      });

      toast.success('Invoice generated and sent successfully!');
      
      // Send WhatsApp Invoice
      if (client?.phone) {
        try {
          await handleSendWhatsAppInvoice(selectedProject.id, result.invoiceNumber, finalAmount, billDueDate);
        } catch (error) {
          console.error('Failed to send WhatsApp invoice:', error);
        }
      }

      setIsSendBillModalOpen(false);
      setBillNotes('');
      setBillDiscount(0);
      setBillTax(0);
    } catch (error) {
      toast.error('Failed to send invoice');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSendWhatsAppReceipt = async (paymentId: string, installmentIndex: number, manualInstallment?: Installment) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) {
      console.error('WhatsApp Error: Payment not found', paymentId);
      return;
    }

    const client = clients.find(c => c.id === payment.clientId);
    if (!client || !client.phone) {
      console.error('WhatsApp Error: Client or phone not found', client);
      toast.error('Client phone number not found');
      return;
    }

    // Basic validation for phone number length
    const cleanedPhone = client.phone.replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      toast.error(`Invalid phone number: "${client.phone}". Please update client details with a full number.`);
      return;
    }

    const installment = manualInstallment || payment.installments[installmentIndex];
    if (!installment) {
      console.error('WhatsApp Error: Installment not found', installmentIndex);
      toast.error('Installment details not found');
      return;
    }

    const project = projects.find(p => p.id === payment.projectId);

    setIsSendingWhatsApp(`${paymentId}-${installmentIndex}`);
    
    // Calculate all values first
    const isAlreadyInHistory = payment.installments.some(inst => 
      manualInstallment && inst.id === manualInstallment.id
    );

    const allInstallments = (manualInstallment && !isAlreadyInHistory)
      ? [...payment.installments, manualInstallment]
      : payment.installments;

    const actualIndex = manualInstallment 
      ? allInstallments.findIndex(inst => inst.id === manualInstallment.id)
      : installmentIndex;

    const installmentsUpToNow = allInstallments.slice(0, actualIndex + 1);
    const totalPaidUpToNow = installmentsUpToNow.reduce((sum, inst) => sum + inst.amount, 0);
    const paidNow = installment.amount;
    const alreadyPaid = totalPaidUpToNow - paidNow;
    const remaining = (payment.totalAmount || 0) - totalPaidUpToNow;

    try {
      // Set the preview data for the hidden template
      setWhatsappReceiptData({
        payment,
        installment,
        installmentIndex: actualIndex,
        manualInstallment
      });
      
      // Wait for DOM to update hidden template
      await new Promise(resolve => setTimeout(resolve, 600));

      let imageData = null;
      if (receiptRef.current) {
        try {
          imageData = await toPng(receiptRef.current, { 
            quality: 0.95, 
            backgroundColor: '#ffffff',
            style: { transform: 'scale(1)', opacity: '1' }
          });
        } catch (imgErr) {
          console.error('Failed to generate receipt image:', imgErr);
        }
      }

      const history = allInstallments.map((inst, idx) => 
        `${idx + 1}. ${format(new Date(inst.date), 'dd MMM yyyy')}: Rs. ${inst.amount.toLocaleString()} (${inst.note || 'Installment'})`
      ).join('\n');

      const message = `*PAYMENT RECEIVED* ✅\n\n` +
        `Hello *${client.name}*,\n\n` +
        `Thank you! We have received your payment for *${project?.title || 'Project'}*.\n\n` +
        `*Transaction Details:*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `*Amount Paid:* Rs. ${installment.amount.toLocaleString()}\n` +
        `*Date:* ${format(new Date(installment.date), 'dd MMM yyyy')}\n` +
        `*Method:* ${installment.paymentMethod}\n` +
        `*Note:* ${installment.note || 'N/A'}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `*Account Summary:*\n` +
        `• Total Invoice: Rs. ${(payment.totalAmount || 0).toLocaleString()}\n` +
        `• Already Paid: Rs. ${alreadyPaid.toLocaleString()}\n` +
        `• *Paid Now:* Rs. ${installment.amount.toLocaleString()}\n` +
        `• *Remaining:* Rs. ${remaining.toLocaleString()}\n\n` +
        `*Full Payment History:*\n${history}\n\n` +
        `Thank you for your business! We appreciate your trust in *Truth Arc Media*. 🙏\n` +
        `_Digital Marketing Agency_`;

      console.log('Sending WhatsApp receipt to:', client.phone);
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: client.phone, message, image: imageData })
      });

      if (response.ok) {
        toast.success('Receipt sent via WhatsApp!');
      } else {
        const data = await response.json();
        console.error('WhatsApp API Error:', data);
        toast.error(`Failed to send: ${data.error || 'Check WhatsApp connection'}`);
      }
    } catch (error) {
      console.error('WhatsApp Error:', error);
      toast.error('Error sending WhatsApp message');
    } finally {
      setIsSendingWhatsApp(null);
    }
  };

  const handleSendWhatsAppInvoice = async (projectId: string, invoiceNumber: string, amount: number, dueDate: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const client = clients.find(c => c.id === project.clientId);
    if (!client || !client.phone) {
      toast.error('Client phone number not found');
      return;
    }

    // Basic validation for phone number length
    const cleanedPhone = client.phone.replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      toast.error(`Invalid phone number: "${client.phone}". Please update client details with a full number.`);
      return;
    }

    try {
      // Ensure selectedProject and bill details are set for the template
      setSelectedProject(project);
      setBillAmount(amount);
      setBillDueDate(dueDate);
      
      // Wait for DOM to update hidden template
      await new Promise(resolve => setTimeout(resolve, 500));

      let imageData = null;
      if (invoiceRef.current) {
        try {
          imageData = await toPng(invoiceRef.current, { 
            quality: 0.95, 
            backgroundColor: '#ffffff',
            style: { transform: 'scale(1)', opacity: '1' }
          });
        } catch (imgErr) {
          console.error('Failed to generate invoice image:', imgErr);
        }
      }

      const projectPayments = payments.filter(p => p.projectId === projectId);
      const allInstallments = projectPayments.flatMap(p => p.installments || []);
      const totalPaid = projectPayments.reduce((sum, p) => sum + p.paidAmount, 0);
      const remaining = (project.budget || 0) - totalPaid;

      const history = allInstallments.length > 0 
        ? allInstallments.map((inst, idx) => 
            `${idx + 1}. ${format(new Date(inst.date), 'dd MMM yyyy')}: Rs. ${inst.amount.toLocaleString()}`
          ).join('\n')
        : 'No previous payments';

      const message = `*INVOICE GENERATED* 📄\n\n` +
        `Hello *${client.name}*,\n\n` +
        `A new invoice has been generated for your project: *${project.title}*.\n\n` +
        `*Invoice Details:*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `*Invoice #:* ${invoiceNumber}\n` +
        `*Due Date:* ${format(new Date(dueDate), 'dd MMM yyyy')}\n` +
        `*Amount Due:* Rs. ${amount.toLocaleString()}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `*Payment Summary:*\n` +
        `• Total Budget: Rs. ${project.budget.toLocaleString()}\n` +
        `• Paid to Date: Rs. ${totalPaid.toLocaleString()}\n` +
        `• *Balance Due:* Rs. ${remaining.toLocaleString()}\n\n` +
        `*Payment History:*\n${history}\n\n` +
        `Please find the detailed invoice image attached. You can make the payment via Bank Transfer or JazzCash.\n\n` +
        `Thank you for choosing *Truth Arc Media*! 🙏\n` +
        `_Digital Marketing Agency_`;

      console.log('Sending WhatsApp invoice to:', client.phone);
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: client.phone, message, image: imageData })
      });

      if (response.ok) {
        toast.success('Invoice sent via WhatsApp!');
      } else {
        const data = await response.json();
        console.error('WhatsApp API Error:', data);
        toast.error(`Failed to send WhatsApp: ${data.error || 'Check connection'}`);
      }
    } catch (error) {
      console.error('WhatsApp Error:', error);
    }
  };

  const handleAddInstallment = async () => {
    if (!selectedPayment || !installmentAmount) {
      toast.error('Please enter an amount');
      return;
    }

    const amount = parseFloat(installmentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount');
      return;
    }

    const newPaidAmount = selectedPayment.paidAmount + amount;
    if (newPaidAmount > selectedPayment.totalAmount) {
      toast.error('Total paid amount cannot exceed invoice amount');
      return;
    }

    const newInstallment: Installment = {
      id: `ins-${Date.now()}`,
      amount,
      date: new Date(paymentDate).toISOString(),
      note: notes || installmentNote || `Payment via ${paymentMethod}`,
      paymentMethod,
      referenceNumber
    };

    const newStatus = newPaidAmount >= selectedPayment.totalAmount ? 'Fully Paid' : 'Partially Paid';
    const client = clients.find(c => c.id === selectedPayment.clientId);
    const project = projects.find(p => p.id === selectedPayment.projectId);

    try {
      setIsGeneratingImage(true);
      const updatedInstallments = [...selectedPayment.installments, newInstallment];
      const installmentIndex = updatedInstallments.length - 1;

      await updatePayment(selectedPayment.id, {
        paidAmount: newPaidAmount,
        status: newStatus,
        installments: updatedInstallments
      });
      
      toast.success('Payment recorded successfully!');
      
      // Send Receipt (Email)
      try {
        await sendReceipt(selectedPayment.id, installmentIndex);
        toast.success('Receipt email sent!');
      } catch (error) {
        console.error('Failed to send receipt email:', error);
      }

      // Send Receipt (WhatsApp)
      if (client?.phone) {
        try {
          await handleSendWhatsAppReceipt(selectedPayment.id, updatedInstallments.length - 1, newInstallment);
        } catch (error) {
          console.error('Failed to send WhatsApp receipt:', error);
        }
      }

      setIsAddPaymentModalOpen(false);
      setInstallmentAmount('');
      setInstallmentNote('');
      setReferenceNumber('');
      setNotes('');
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    } catch (error) {
      toast.error('Failed to record payment');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => { setActiveTab('billing'); setStatusFilter('All Status'); }}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'billing' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Receipt className="w-4 h-4" />
          Billing
        </button>
        <button
          onClick={() => { setActiveTab('registration'); setStatusFilter('All Status'); }}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'registration' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Wallet className="w-4 h-4" />
          Payment Registration
        </button>
      </div>

      {/* Dashboard Section */}
      {activeTab === 'billing' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Bills Generated" value={billingStats.totalGenerated} icon={<Receipt />} color="bg-indigo-600" />
          <StatCard title="Bills Sent to Clients" value={billingStats.sent} icon={<Send />} color="bg-emerald-500" />
          <StatCard title="Pending Bills" value={billingStats.pending} icon={<Clock />} color="bg-amber-500" />
          <StatCard title="Total Billing Amount" value={`Rs. ${(billingStats.totalAmount || 0).toLocaleString()}`} icon={<DollarSign />} color="bg-slate-900" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Expected Revenue" value={`Rs. ${(registrationStats.totalExpected || 0).toLocaleString()}`} icon={<TrendingUp />} color="bg-indigo-600" />
          <StatCard title="Revenue Collected" value={`Rs. ${(registrationStats.totalCollected || 0).toLocaleString()}`} icon={<CheckCircle2 />} color="bg-emerald-500" />
          <StatCard title="Remaining Amount" value={`Rs. ${(registrationStats.outstanding || 0).toLocaleString()}`} icon={<DollarSign />} color="bg-rose-500" />
          <StatCard title="Collection Progress" value={`${registrationStats.progress}%`} icon={<TrendingUp />} color="bg-amber-500" />
          <StatCard title="Overdue Payments" value={registrationStats.overdueCount} icon={<Clock />} color="bg-slate-900" />
        </div>
      )}

      {/* Filters & Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder={activeTab === 'billing' ? "Search projects..." : "Search invoices..."}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>All Status</option>
              {activeTab === 'billing' ? (
                <>
                  <option>Not Sent</option>
                  <option>Bill Sent</option>
                </>
              ) : (
                <>
                  <option>Zero Received</option>
                  <option>Partially Paid</option>
                  <option>Fully Paid</option>
                  <option>Overdue</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                {activeTab === 'billing' ? (
                  <>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project / Client</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Budget</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Progress</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice #</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project / Client</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Due</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Received</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Balance</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTab === 'billing' ? (
                billingData.length === 0 ? <EmptyState /> : billingData.map((item) => (
                  <tr key={item.project.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.project.title}</p>
                        <p className="text-xs text-slate-500">{item.client?.name || 'Unknown'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-sm text-slate-900">Rs. {(item.project.budget || 0).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      {item.invoice ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-emerald-600">Rec: Rs. {(item.invoice.paidAmount || 0).toLocaleString()}</span>
                            <span className="text-rose-500">Left: Rs. {((item.invoice.totalAmount || 0) - (item.invoice.paidAmount || 0)).toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, (item.invoice.paidAmount / item.invoice.totalAmount) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No invoice yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        item.status === 'Bill Sent' ? (item.invoice?.status === 'Fully Paid' ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700") : "bg-amber-100 text-amber-700"
                      )}>
                        {item.invoice?.status || item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!item.invoice ? (
                        <button 
                          onClick={() => { 
                            setSelectedProject(item.project); 
                            setBillAmount(item.project.budget);
                            setIsSendBillModalOpen(true); 
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 ml-auto"
                        >
                          <Send className="w-3 h-3" />
                          Send Bill
                        </button>
                      ) : (
                        <button 
                          onClick={() => { setSelectedPayment(item.invoice!); setIsViewInvoiceModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                registrationData.length === 0 ? <EmptyState /> : registrationData.map(({ payment, project, client }) => (
                  <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">{payment.invoiceNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{project?.title}</p>
                        <p className="text-xs text-slate-500">{client?.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-sm text-slate-900">Rs. {(payment.totalAmount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-sm text-emerald-600">Rs. {(payment.paidAmount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-sm text-rose-500">Rs. {((payment.totalAmount || 0) - (payment.paidAmount || 0)).toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        payment.status === 'Fully Paid' ? "bg-emerald-100 text-emerald-700" :
                        payment.status === 'Partially Paid' ? "bg-amber-100 text-amber-700" :
                        payment.status === 'Zero Received' ? "bg-rose-100 text-rose-700" :
                        payment.status === 'Overdue' ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
                      )}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedPayment(payment); setIsAddPaymentModalOpen(true); }}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Record Payment"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { setSelectedPayment(payment); setIsViewInvoiceModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {payment.installments.length > 0 && (
                          <button 
                            onClick={() => handleSendWhatsAppReceipt(payment.id, payment.installments.length - 1)}
                            disabled={isSendingWhatsApp === `${payment.id}-${payment.installments.length - 1}`}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Send Latest Receipt via WhatsApp"
                          >
                            {isSendingWhatsApp === `${payment.id}-${payment.installments.length - 1}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Smartphone className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this payment record?')) {
                              deletePayment(payment.id);
                              toast.success('Payment deleted');
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Bill Modal */}
      {isSendBillModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl overflow-hidden shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] flex flex-col md:flex-row">
            {/* Left Side: Inputs */}
            <div className="flex-1 p-8 overflow-y-auto border-r border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Invoice Details</h3>
                  <p className="text-slate-500 text-sm">Configure your bill before sending</p>
                </div>
                <button 
                  onClick={() => setIsSendBillModalOpen(false)} 
                  className="md:hidden p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-8">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due Date</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="date"
                        value={billDueDate}
                        onChange={(e) => setBillDueDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base Amount (Rs.)</label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="number"
                        value={billAmount}
                        onChange={(e) => setBillAmount(Number(e.target.value))}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Adjustments */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-rose-500">Discount (Rs.)</label>
                    <div className="relative">
                      <ArrowDownRight className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-rose-400" />
                      <input 
                        type="number"
                        value={billDiscount}
                        onChange={(e) => setBillDiscount(Number(e.target.value))}
                        className="w-full pl-10 pr-4 py-3 bg-rose-50/30 border border-rose-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all text-rose-600 font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-emerald-500">Tax / Extra (Rs.)</label>
                    <div className="relative">
                      <ArrowUpRight className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                      <input 
                        type="number"
                        value={billTax}
                        onChange={(e) => setBillTax(Number(e.target.value))}
                        className="w-full pl-10 pr-4 py-3 bg-emerald-50/30 border border-emerald-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-emerald-600 font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description / Notes</label>
                  <textarea 
                    value={billNotes}
                    onChange={(e) => setBillNotes(e.target.value)}
                    placeholder="Add specific details about the services provided..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-24 resize-none"
                  />
                </div>

                {/* Bank Details */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Payment Method</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="relative">
                      <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Bank Name"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="text"
                        placeholder="Account Number"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                      <input 
                        type="text"
                        placeholder="Account Name"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsSendBillModalOpen(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSendBill}
                    disabled={syncing}
                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
                  >
                    {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                    Send Invoice
                  </button>
                </div>
              </div>
            </div>

            {/* Right Side: Preview */}
            <div className="hidden md:flex flex-1 bg-slate-900 p-8 flex-col relative overflow-hidden">
              <button 
                onClick={() => setIsSendBillModalOpen(false)} 
                className="absolute right-6 top-6 p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="mb-8">
                <h4 className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">Live Preview</h4>
                <div className="bg-white rounded-3xl p-8 shadow-2xl transform rotate-1 scale-95 origin-top-right">
                  {/* Mock Invoice Header */}
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                        <Receipt className="w-6 h-6 text-white" />
                      </div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">INVOICE</h2>
                      <p className="text-slate-400 text-[10px] font-mono">#INV-XXXXXX</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date</p>
                      <p className="text-xs font-bold text-slate-900">{format(new Date(), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="mb-8">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Billed To</p>
                    <p className="text-sm font-bold text-slate-900">{clients.find(c => c.id === selectedProject.clientId)?.name}</p>
                    <p className="text-[10px] text-slate-500">{clients.find(c => c.id === selectedProject.clientId)?.email}</p>
                  </div>

                  {/* Items Table */}
                  <div className="border-t border-slate-100 pt-6 mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</p>
                        <p className="text-xs font-bold text-slate-900 mt-1">{selectedProject.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{billNotes || 'Service charges'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</p>
                        <p className="text-xs font-bold text-slate-900 mt-1">Rs. {(billAmount || 0).toLocaleString()}</p>
                      </div>
                    </div>

                    {billDiscount > 0 && (
                      <div className="flex justify-between items-center mb-2 text-rose-500">
                        <p className="text-[10px] font-bold uppercase tracking-widest">Discount</p>
                        <p className="text-xs font-bold">- Rs. {(billDiscount || 0).toLocaleString()}</p>
                      </div>
                    )}

                    {billTax > 0 && (
                      <div className="flex justify-between items-center mb-2 text-emerald-600">
                        <p className="text-[10px] font-bold uppercase tracking-widest">Tax / Extra</p>
                        <p className="text-xs font-bold">+ Rs. {(billTax || 0).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center">
                    <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Total Due</p>
                    <p className="text-lg font-black text-indigo-600">Rs. {((billAmount || 0) - (billDiscount || 0) + (billTax || 0)).toLocaleString()}</p>
                  </div>

                  {/* Footer */}
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Payment Details</p>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500">{bankName}</span>
                      <span className="font-mono font-bold text-slate-900">{accountNumber}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="mt-auto">
                <div className="flex items-center gap-2 text-white/30 text-[10px] font-bold uppercase tracking-widest">
                  <div className="w-8 h-[1px] bg-white/20"></div>
                  Truth Arc Media Billing System
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isAddPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">Register Payment</h3>
              <button onClick={() => setIsAddPaymentModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Project Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project</label>
                  <select 
                    value={selectedPayment?.id || ''}
                    onChange={(e) => {
                      const payment = payments.find(p => p.id === e.target.value);
                      setSelectedPayment(payment || null);
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    disabled={!!selectedPayment && payments.some(p => p.id === selectedPayment.id)}
                  >
                    <option value="">Select a project</option>
                    {payments.filter(p => p.isSent).map(p => (
                      <option key={p.id} value={p.id}>
                        {projects.find(proj => proj.id === p.projectId)?.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Date */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Date</label>
                  <input 
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                {/* Invoice Total */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice Total (Rs.)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={selectedPayment ? (selectedPayment.totalAmount || 0).toLocaleString() : '0'}
                      readOnly
                      className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-bold text-sm"
                    />
                  </div>
                </div>

                {/* Amount Paid Now */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount Paid Now (Rs.)</label>
                  <input 
                    type="number"
                    value={installmentAmount}
                    onChange={(e) => setInstallmentAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                    placeholder="Enter amount"
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Method</label>
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="JazzCash">JazzCash</option>
                    <option value="Cash">Cash</option>
                    <option value="Online Payment Gateway">Online Payment Gateway</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                {/* Status Preview / Remaining Balance */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Remaining Balance (Rs.)</label>
                  <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedPayment 
                        ? ((selectedPayment.totalAmount || 0) - (selectedPayment.paidAmount || 0) - (parseFloat(installmentAmount) || 0)).toLocaleString() 
                        : '0'}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      selectedPayment && ((selectedPayment.totalAmount || 0) - (selectedPayment.paidAmount || 0) - (parseFloat(installmentAmount) || 0)) <= 0 
                        ? "bg-emerald-100 text-emerald-600" 
                        : "bg-amber-100 text-amber-600"
                    )}>
                      {selectedPayment && ((selectedPayment.totalAmount || 0) - (selectedPayment.paidAmount || 0) - (parseFloat(installmentAmount) || 0)) <= 0 
                        ? 'Paid' 
                        : 'Partial'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notes</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm h-24"
                  placeholder="Payment details..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  onClick={() => setIsAddPaymentModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddInstallment}
                  disabled={syncing || !selectedPayment || !installmentAmount}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Register Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {isViewInvoiceModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">INVOICE</h2>
                  <p className="text-slate-400 font-mono text-sm mt-1">{selectedPayment.invoiceNumber}</p>
                </div>
                <button onClick={() => setIsViewInvoiceModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-12">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Billed To</p>
                  <p className="font-bold text-slate-900">{clients.find(c => c.id === selectedPayment.clientId)?.name}</p>
                  <p className="text-sm text-slate-500 mt-1">{clients.find(c => c.id === selectedPayment.clientId)?.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Project</p>
                  <p className="font-bold text-slate-900">{projects.find(p => p.id === selectedPayment.projectId)?.title}</p>
                  <p className="text-sm text-slate-500 mt-1">Due: {format(new Date(selectedPayment.dueDate), 'MMM dd, yyyy')}</p>
                </div>
              </div>

              <div className="border-y border-slate-100 py-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm font-bold text-slate-900">Total Project Budget</p>
                  <p className="text-sm font-bold text-slate-900">Rs. {(selectedPayment.totalAmount || 0).toLocaleString()}</p>
                </div>
                <div className="flex justify-between items-center text-emerald-600">
                  <p className="text-sm font-bold">Total Paid to Date</p>
                  <p className="text-sm font-bold">Rs. {(selectedPayment.paidAmount || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Installment Tracking Panel</p>
                {selectedPayment.installments.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No payments recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedPayment.installments.map((ins, idx) => (
                      <div key={ins.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div>
                          <p className="text-xs font-bold text-slate-900">Payment {idx + 1} • {ins.paymentMethod}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{format(new Date(ins.date), 'MMM dd, yyyy')} {ins.referenceNumber ? `• Ref: ${ins.referenceNumber}` : ''}</p>
                        </div>
                        <p className="text-sm font-bold text-emerald-600">+ Rs. {(ins.amount || 0).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-900 rounded-2xl p-6 text-white flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Remaining Balance</p>
                  <h4 className="text-2xl font-bold">Rs. {((selectedPayment.totalAmount || 0) - (selectedPayment.paidAmount || 0)).toLocaleString()}</h4>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    selectedPayment.status === 'Fully Paid' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                  )}>
                    {selectedPayment.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Templates for Image Generation */}
      <div className="fixed -left-[2000px] top-0 pointer-events-none">
        {selectedProject && (
          <div ref={invoiceRef}>
            <InvoiceTemplate 
              project={selectedProject}
              client={clients.find(c => c.id === selectedProject.clientId)!}
              invoiceNumber={`INV-${Date.now().toString().slice(-6)}`}
              totalAmount={billAmount - billDiscount + billTax}
              paidAmount={0}
              dueDate={billDueDate}
              notes={billNotes}
              bankDetails={{ bankName, accountNumber, accountName }}
            />
          </div>
        )}
        {whatsappReceiptData && (
          <div ref={receiptRef}>
            <ReceiptTemplate 
              project={projects.find(p => p.id === whatsappReceiptData.payment.projectId)!}
              client={clients.find(c => c.id === whatsappReceiptData.payment.clientId)!}
              invoiceNumber={whatsappReceiptData.payment.invoiceNumber}
              installment={whatsappReceiptData.installment}
              totalPaid={(() => {
                const isAlreadyInHistory = whatsappReceiptData.payment.installments.some(inst => 
                  whatsappReceiptData.manualInstallment && inst.id === whatsappReceiptData.manualInstallment.id
                );
                const all = (whatsappReceiptData.manualInstallment && !isAlreadyInHistory)
                  ? [...whatsappReceiptData.payment.installments, whatsappReceiptData.manualInstallment]
                  : whatsappReceiptData.payment.installments;
                return all.slice(0, whatsappReceiptData.installmentIndex + 1).reduce((sum, inst) => sum + inst.amount, 0);
              })()}
              remainingBalance={(() => {
                const isAlreadyInHistory = whatsappReceiptData.payment.installments.some(inst => 
                  whatsappReceiptData.manualInstallment && inst.id === whatsappReceiptData.manualInstallment.id
                );
                const all = (whatsappReceiptData.manualInstallment && !isAlreadyInHistory)
                  ? [...whatsappReceiptData.payment.installments, whatsappReceiptData.manualInstallment]
                  : whatsappReceiptData.payment.installments;
                const totalPaid = all.slice(0, whatsappReceiptData.installmentIndex + 1).reduce((sum, inst) => sum + inst.amount, 0);
                return (whatsappReceiptData.payment.totalAmount || 0) - totalPaid;
              })()}
              allInstallments={(() => {
                const isAlreadyInHistory = whatsappReceiptData.payment.installments.some(inst => 
                  whatsappReceiptData.manualInstallment && inst.id === whatsappReceiptData.manualInstallment.id
                );
                return (whatsappReceiptData.manualInstallment && !isAlreadyInHistory)
                  ? [...whatsappReceiptData.payment.installments, whatsappReceiptData.manualInstallment]
                  : whatsappReceiptData.payment.installments;
              })()}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className={cn("rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group", color)}>
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-4">
        <p className="text-white/70 font-bold uppercase tracking-wider text-[10px]">{title}</p>
        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
          {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' })}
        </div>
      </div>
      <h3 className="text-2xl font-bold">{value}</h3>
    </div>
    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
      {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-24 h-24' })}
    </div>
  </div>
);

const EmptyState = () => (
  <tr>
    <td colSpan={10} className="px-6 py-20 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
          <Receipt className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-slate-400 text-sm font-medium">No records found matching your criteria.</p>
      </div>
    </td>
  </tr>
);
