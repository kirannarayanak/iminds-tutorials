'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { PaymentStatusBadge } from '@/components/ui/Badge';
import { LoadingSpinner, EmptyState } from '@/components/ui/LoadingSpinner';
import { Payment } from '@/types';
import { getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CreditCard } from 'lucide-react';

export default function StudentPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  const fetchPayments = async () => {
    const { data } = await api.get('/payments');
    setPayments(data.data);
  };

  useEffect(() => {
    fetchPayments().catch((err) => toast.error(getErrorMessage(err))).finally(() => setLoading(false));
  }, []);

  async function handlePay(payment: Payment) {
    if (!confirm(`Pay ${formatCurrency(payment.amount, payment.currency)} for ${payment.course_name}?`)) return;
    setPaying(payment.course_id);
    try {
      const { data: initData } = await api.post('/payments/initiate', { courseId: payment.course_id });
      const { paymentId, gatewayTransactionId, isMock } = initData.data;

      if (isMock) {
        const { data: confirmRes } = await api.post('/payments/confirm', { paymentId, gatewayTransactionId });
        if (confirmRes.data.enrolled) {
          toast.success(confirmRes.message || 'Payment successful! You are now enrolled.');
        } else {
          toast.success('Payment recorded.');
        }
        await fetchPayments();
      } else {
        toast('Redirecting to payment gateway...');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPaying(null);
    }
  }

  if (loading) return <><Header title="Payments" /><LoadingSpinner /></>;

  return (
    <>
      <Header title="My Payments" subtitle="Course fee status and payment history" />
      <div className="p-8">
        {payments.length === 0 ? (
          <EmptyState title="No payment records" description="Pay for a course from the Courses page to enroll." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {payments.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <PaymentStatusBadge status={p.status} />
                </div>
                <h3 className="font-semibold text-gray-900">{p.course_name}</h3>
                <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(p.amount, p.currency)}</p>
                {p.paid_at && <p className="text-xs text-gray-400 mt-1">Paid on {formatDate(p.paid_at)}</p>}
                {!p.paid_at && <p className="text-xs text-gray-400 mt-1">Initiated on {formatDate(p.created_at)}</p>}

                {p.status === 'pending' && (
                  <Button
                    onClick={() => handlePay(p)}
                    loading={paying === p.course_id}
                    className="mt-4 w-full"
                  >
                    Pay Now
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
