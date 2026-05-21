import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import client from '../../src/api/client';

export default function HomeScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoint = user?.role === 'admin' ? '/dashboard/admin'
      : user?.role === 'teacher' ? '/dashboard/teacher'
      : '/dashboard/student';
    client.get(endpoint)
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#2563eb" size="large" /></View>;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.welcomeBox}>
        <Text style={styles.greeting}>{greeting()},</Text>
        <Text style={styles.name}>{user?.firstName} {user?.lastName} 👋</Text>
        <Text style={styles.role}>{user?.role?.toUpperCase()}</Text>
      </View>

      {user?.role === 'student' && data && (
        <>
          <View style={styles.statsRow}>
            <StatBox label="Courses" value={data.enrolledCourses?.length ?? 0} icon="book" color="#2563eb" />
            <StatBox label="Pending Quizzes" value={data.pendingQuizzes?.length ?? 0} icon="help-circle" color="#f59e0b" />
            <StatBox label="Completed" value={data.completedQuizzes?.length ?? 0} icon="checkmark-circle" color="#10b981" />
          </View>

          {data.pendingQuizzes?.length > 0 && (
            <Section title="Pending Quizzes" icon="alert-circle">
              {data.pendingQuizzes.map((q: any) => (
                <Card key={q.id} title={q.title} subtitle={`${q.course_name} · ${q.module_title}`} accent="#f59e0b" />
              ))}
            </Section>
          )}

          {data.upcomingClasses?.length > 0 && (
            <Section title="Class Schedule" icon="time">
              {data.upcomingClasses.map((c: any, i: number) => (
                <Card key={i} title={c.course_name} subtitle={`${c.day_of_week} · ${c.start_time.substring(0,5)} – ${c.end_time.substring(0,5)}`} accent="#2563eb" />
              ))}
            </Section>
          )}
        </>
      )}

      {user?.role === 'teacher' && data && (
        <>
          <View style={styles.statsRow}>
            <StatBox label="Courses" value={data.assignedCourses?.length ?? 0} icon="book" color="#2563eb" />
            <StatBox label="Students" value={data.assignedCourses?.reduce((s: number, c: any) => s + (c.student_count || 0), 0) ?? 0} icon="people" color="#10b981" />
          </View>
          {data.weakStudents?.length > 0 && (
            <Section title="Students Needing Help" icon="warning">
              {data.weakStudents.map((s: any) => (
                <Card key={s.id} title={`${s.first_name} ${s.last_name}`} subtitle={`Avg score: ${s.avg_score_pct}%`} accent="#ef4444" />
              ))}
            </Section>
          )}
        </>
      )}

      {user?.role === 'admin' && data && (
        <View style={styles.statsRow}>
          <StatBox label="Students" value={data.totalStudents ?? 0} icon="people" color="#2563eb" />
          <StatBox label="Teachers" value={data.totalTeachers ?? 0} icon="person" color="#7c3aed" />
          <StatBox label="Courses" value={data.totalCourses ?? 0} icon="book" color="#10b981" />
        </View>
      )}
    </ScrollView>
  );
}

function StatBox({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <View style={[styles.statBox, { borderTopColor: color }]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={16} color="#374151" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Card({ title, subtitle, accent }: { title: string; subtitle: string; accent: string }) {
  return (
    <View style={[styles.card, { borderLeftColor: accent }]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  welcomeBox: { backgroundColor: '#1e40af', borderRadius: 20, padding: 24, marginBottom: 20 },
  greeting: { color: '#bfdbfe', fontSize: 14 },
  name: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  role: { color: '#93c5fd', fontSize: 11, marginTop: 6, letterSpacing: 1 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 16, borderTopWidth: 3, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#111827', marginTop: 8 },
  statLabel: { fontSize: 11, color: '#6b7280', textAlign: 'center', marginTop: 2 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 4, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cardSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 3 },
});
