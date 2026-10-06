import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { alignItems: 'center', paddingBottom: 28, paddingHorizontal: 24 },
    emblemContainer: { width: 88, height: 88, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emblem: { width: '100%', height: '100%' },
    subtitle: { fontSize: 13, lineHeight: 20, marginTop: 12, textAlign: 'center' },
    title: { fontSize: 28, fontWeight: '700', textAlign: 'center', lineHeight: 34, letterSpacing: -0.8 },
    formContainer: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20 },
    formCard: { borderRadius: 22, borderWidth: 1, padding: 24, shadowColor: '#10251a', shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, elevation: 2 },
    inputWrapper: { marginBottom: 20 },
    inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
    input: { minHeight: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16 },
    inputFocused: { borderWidth: 1 },
    passwordField: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, minHeight: 52 },
    passwordInput: { flex: 1, minWidth: 0, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16 },
    passwordToggle: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    loginButton: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    disabledButton: { opacity: 0.65 },
    loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
