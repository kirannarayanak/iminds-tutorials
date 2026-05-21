import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../src/api/client';

export default function PaymentsScreen() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  const fetchPayments = () => {
    setLoading(true);
    client.get('/payments')
      .then((r) => setPayments(r.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPayments(); }, []);

  async function handlePay(courseId: string, courseName: string) {
    setPaying(courseId);
    try {
      const { data: initData } = await client.post('/payments/initiate', { courseId });
      const { paymentId, gatewayTransactionId, isMock, amount, currency } = initData.data;

      if (isMock) {
        Alert.alert(
          'Mock Payment',
          `Confirm payment of ${currency} ${amount} for ${courseName}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Pay Now',
              onPress: async () => {
                await client.post('/payments/confirm', { paymentId, gatewayTransactionId });
                Alert.alert('Success', 'Payment completed!');
                fetchPayments();
              },
            },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Payment failed');
    } finally {
      setPaying(null);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#2563eb" size="large" /></View>;

  const statusColor: Record<string, string> = {
    paid: '#10b981', pending: '#f59e0b', failed: '#ef4444', refunded: '#6b7280',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Payments</Text>
      {payments.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="card-outline" size={40} color="#d1d5db" />
          <Text style={styles.emptyText}>No payment records</Text>
        </View>
      ) : payments.map((p) => (
        <View key={p.id} style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.courseName}>{p.course_name}</Text>
            <View style={[styles.badge, { backgroundColor: statusColor[p.status] + '20' }]}>
              <Text style={[styles.badgeText, { color: statusColor[p.status] }]}>
                {p.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.amount}>{p.currency} {p.amount}</Text>
          {p.paid_at && <Text style={styles.date}>Paid: {new Date(p.paid_at).toLocaleDateString()}</Text>}

          {p.status === 'pending' && (
            <TouchableOpacity
              style={styles.payBtn}
              onPress={() => handlePay(p.course_id, p.course_name)}
              disabled={paying === p.course_id}
            >
              {paying === p.course_id
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.payBtnText}>Pay Now</Text>}
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#9ca3af', marginTop: 8, fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  courseName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  amount: { fontSize: 22, fontWeight: '800', color: '#1e40af' },
  date: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  payBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  payBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
