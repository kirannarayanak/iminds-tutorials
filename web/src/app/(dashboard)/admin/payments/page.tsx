'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/ui/Card';
import { LoadingSpinner, EmptyState } from '@/components/ui/LoadingSpinner';
import { PaymentStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Payment } from '@/types';
import { getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';
import { CreditCard, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/payments'),
      api.get('/payments/summary'),
    ]).then(([pr, sr]) => {
      setPayments(pr.data.data);
      setSummary(sr.data.data);
    }).catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(paymentId: string, status: string) {
    try {
      await api.patch(`/payments/${paymentId}/status`, { status });
      toast.success('Status updated');
      const { data } = await api.get('/payments');
      setPayments(data.data);
    } catch (err) { toast.error(getErrorMessage(err)); }
  }

  if (loading) return <><Header title="Payments" /><LoadingSpinner /></>;

  return (
    <>
      <Header title="Payment Management" subtitle="Track all student payments" />
      <div className="p-8 space-y-6">

        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Revenue" value={formatCurrency(summary.total_revenue)} icon={<DollarSign className="w-5 h-5" />} color="bg-green-50 text-green-600" />
            <StatCard label="Paid Students" value={summary.paying_students} icon={<CheckCircle className="w-5 h-5" />} color="bg-blue-50 text-blue-600" />
            <StatCard label="Paid Transactions" value={summary.total_paid} icon={<CreditCard className="w-5 h-5" />} color="bg-purple-50 text-purple-600" />
            <StatCard label="Pending" value={summary.total_pending} icon={<Clock className="w-5 h-5" />} color="bg-yellow-50 text-yellow-600" />
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {payments.length === 0 ? (
            <EmptyState title="No payments yet" />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Student</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Course</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Amount</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{p.first_name} {p.last_name}</td>
                    <td className="px-6 py-3 text-gray-600">{p.course_name}</td>
                    <td className="px-6 py-3 font-semibold">{formatCurrency(p.amount, p.currency)}</td>
                    <td className="px-6 py-3"><PaymentStatusBadge status={p.status} /></td>
                    <td className="px-6 py-3 text-gray-400 text-xs">{formatDate(p.paid_at || p.created_at)}</td>
                    <td className="px-6 py-3">
                      {p.status === 'pending' && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(p.id, 'paid')}>Mark Paid</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
