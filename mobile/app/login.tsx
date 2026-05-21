import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Login Failed', err?.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>iM</Text>
        </View>
        <Text style={styles.title}>iMinds Tutorials</Text>
        <Text style={styles.subtitle}>CBSE Grade 9 & 10 Online Learning</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sign in</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your username"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry={!showPw}
            />
            <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.showBtn}>
              <Text style={styles.showBtnText}>{showPw ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Sign In</Text>}
        </TouchableOpacity>

        <Text style={styles.hint}>Forgot password? Contact your administrator.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e40af', justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoBox: { width: 64, height: 64, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoText: { fontSize: 24, fontWeight: '800', color: '#1e40af' },
  title: { fontSize: 26, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: '#93c5fd', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  showBtn: { paddingHorizontal: 10, paddingVertical: 10 },
  showBtnText: { color: '#2563eb', fontSize: 13, fontWeight: '500' },
  loginBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 16 },
});
