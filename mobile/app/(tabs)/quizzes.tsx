import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../src/api/client';
import { useAuth } from '../../src/contexts/AuthContext';

export default function QuizzesScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/dashboard/student')
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#2563eb" size="large" /></View>;

  const pending = data?.pendingQuizzes || [];
  const completed = data?.completedQuizzes || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>My Quizzes</Text>

      <Section title={`Pending (${pending.length})`} icon="alert-circle" iconColor="#f59e0b">
        {pending.length ? pending.map((q: any) => (
          <View key={q.id} style={[styles.card, { borderLeftColor: '#f59e0b' }]}>
            <Text style={styles.cardTitle}>{q.title}</Text>
            <Text style={styles.cardSub}>{q.course_name}</Text>
            <Text style={[styles.status, { color: '#f59e0b' }]}>Pending →</Text>
          </View>
        )) : <Text style={styles.empty}>No pending quizzes 🎉</Text>}
      </Section>

      <Section title={`Completed (${completed.length})`} icon="checkmark-circle" iconColor="#10b981">
        {completed.length ? completed.map((q: any) => {
          const pct = Math.round((q.score / q.max_score) * 100);
          return (
            <View key={q.id} style={[styles.card, { borderLeftColor: q.is_passed ? '#10b981' : '#ef4444' }]}>
              <Text style={styles.cardTitle}>{q.quiz_title}</Text>
              <Text style={styles.cardSub}>{q.course_name}</Text>
              <View style={styles.scoreRow}>
                <Text style={[styles.scorePct, { color: q.is_passed ? '#10b981' : '#ef4444' }]}>{pct}%</Text>
                <Text style={[styles.passFail, { backgroundColor: q.is_passed ? '#dcfce7' : '#fee2e2', color: q.is_passed ? '#166534' : '#991b1b' }]}>
                  {q.is_passed ? 'PASS' : 'FAIL'}
                </Text>
              </View>
            </View>
          );
        }) : <Text style={styles.empty}>No completed quizzes yet</Text>}
      </Section>
    </ScrollView>
  );
}

function Section({ title, icon, iconColor, children }: any) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={16} color={iconColor} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cardSub: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  status: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  scorePct: { fontSize: 18, fontWeight: '800' },
  passFail: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  empty: { color: '#9ca3af', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
});
