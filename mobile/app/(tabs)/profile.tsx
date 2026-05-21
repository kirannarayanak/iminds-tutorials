import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  }

  const initials = `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`.toUpperCase();
  const roleColor: Record<string, string> = { admin: '#7c3aed', teacher: '#2563eb', student: '#059669' };
  const color = roleColor[user?.role ?? 'student'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, { backgroundColor: color + '20' }]}>
          <Text style={[styles.avatarText, { color }]}>{initials}</Text>
        </View>
        <Text style={styles.fullName}>{user?.firstName} {user?.lastName}</Text>
        <View style={[styles.roleBadge, { backgroundColor: color }]}>
          <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.card}>
        <InfoRow icon="person-outline" label="Username" value={`@${user?.username}`} />
        {user?.email && <InfoRow icon="mail-outline" label="Email" value={user.email} />}
      </View>

      {/* Actions */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.actionRow} onPress={() => Alert.alert('Coming soon', 'Password change available on web.')}>
          <Ionicons name="key-outline" size={20} color="#374151" />
          <Text style={styles.actionText}>Change Password</Text>
          <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>iMinds Tutorials v1.0.0</Text>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={18} color="#6b7280" />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '800' },
  fullName: { fontSize: 22, fontWeight: '800', color: '#111827' },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 8 },
  roleText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 4, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoLabel: { fontSize: 11, color: '#9ca3af' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  actionText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#374151' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fee2e2', borderRadius: 14, paddingVertical: 14, marginTop: 8 },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
  version: { textAlign: 'center', color: '#d1d5db', fontSize: 12, marginTop: 24 },
});
