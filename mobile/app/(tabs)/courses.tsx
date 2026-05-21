import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../src/api/client';

export default function CoursesScreen() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/courses')
      .then((r) => setCourses(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#2563eb" size="large" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>My Courses</Text>
      {courses.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="book-outline" size={40} color="#d1d5db" />
          <Text style={styles.emptyText}>No courses available</Text>
        </View>
      ) : courses.map((c) => (
        <View key={c.id} style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons name="book" size={22} color="#2563eb" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{c.name}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>{c.description || 'No description'}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardBadge}>{c.grade === 'both' ? 'Grade 9 & 10' : `Grade ${c.grade}`}</Text>
              <Text style={styles.cardPrice}>{c.currency} {c.price}</Text>
            </View>
          </View>
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
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', gap: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardIcon: { width: 48, height: 48, backgroundColor: '#eff6ff', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardDesc: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' },
  cardBadge: { backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: 11, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  cardPrice: { fontSize: 13, fontWeight: '700', color: '#111827' },
});
