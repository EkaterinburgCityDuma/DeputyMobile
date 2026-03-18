import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = 'ВАШ_API_URL'; // Замените на актуальный

const CreateUserScreen = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Состояния формы
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState(null);
    const [selectedDeputy, setSelectedDeputy] = useState(null);

    // Состояния UI
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRoleSelectOpen, setIsRoleSelectOpen] = useState(false);
    const [isDeputySelectOpen, setIsDeputySelectOpen] = useState(false);
    const [deputies, setDeputies] = useState([]);

    const roles = ['Admin', 'Deputy', 'Helper'];

    // Загрузка списка депутатов для привязки к помощнику
    useEffect(() => {
        fetchDeputies();
    }, []);

    const fetchDeputies = async () => {
        try {
            const response = await fetch(`${API_URL}/Auth/all`);
            const data = await response.json();
            // Фильтруем только тех, у кого есть роль Deputy
            const filtered = data.filter(u => u.roles && u.roles.includes('Deputy'));
            setDeputies(filtered);
        } catch (error) {
            console.error("Ошибка при загрузке депутатов:", error);
        }
    };

    const handleSubmit = async () => {
        if (!fullName || !email || !password || !selectedRole) {
            Alert.alert("Ошибка", "Заполните все обязательные поля");
            return;
        }

        setIsSubmitting(true);

        const payload = {
            email,
            job_title: jobTitle,
            full_name: fullName,
            password,
            roles: [selectedRole], // Отправляем как список из одного элемента
            deputy_id: selectedRole === 'Helper' ? selectedDeputy?.id : null
        };

        try {
            const response = await fetch(`${API_URL}/api/Auth/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                Alert.alert("Успех", "Пользователь успешно создан");
                router.back();
            } else {
                Alert.alert("Ошибка", "Не удалось создать пользователя");
            }
        } catch (error) {
            Alert.alert("Ошибка", "Проблемы с соединением");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#fff' }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <ScrollView
                contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 20 }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <LinearGradient
                    colors={['#2A6E3F', '#349339']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.header, { paddingTop: insets.top + 20 }]}
                >
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Новый пользователь</Text>
                </LinearGradient>

                <View style={styles.card}>
                    <TextInput
                        style={styles.input}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="ФИО *"
                        placeholderTextColor="#999"
                    />

                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Email *"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor="#999"
                    />

                    <TextInput
                        style={styles.input}
                        value={jobTitle}
                        onChangeText={setJobTitle}
                        placeholder="Должность"
                        placeholderTextColor="#999"
                    />

                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Пароль *"
                        secureTextEntry
                        placeholderTextColor="#999"
                    />

                    {/* Выбор Роли */}
                    <View style={[styles.selectWrapper, { zIndex: 1000 }]}>
                        <TouchableOpacity
                            style={styles.selectTrigger}
                            onPress={() => {
                                setIsRoleSelectOpen(!isRoleSelectOpen);
                                setIsDeputySelectOpen(false);
                            }}
                        >
                            <Text style={!selectedRole ? styles.placeholderText : styles.selectValue}>
                                {selectedRole || 'Выберите роль *'}
                            </Text>
                            <Ionicons
                                name={isRoleSelectOpen ? "chevron-up" : "chevron-down"}
                                size={20}
                                color="#6b7280"
                            />
                        </TouchableOpacity>

                        {isRoleSelectOpen && (
                            <View style={styles.selectDropdown}>
                                {roles.map((role) => (
                                    <TouchableOpacity
                                        key={role}
                                        style={[
                                            styles.selectItem,
                                            selectedRole === role && styles.selectItemSelected
                                        ]}
                                        onPress={() => {
                                            setSelectedRole(role);
                                            setIsRoleSelectOpen(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.selectItemText,
                                            selectedRole === role && styles.selectItemTextSelected
                                        ]}>
                                            {role}
                                        </Text>
                                        {selectedRole === role && (
                                            <Ionicons name="checkmark" size={18} color="#0f6319" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Выбор Депутата (только для Helper) */}
                    {selectedRole === 'Helper' && (
                        <View style={[styles.selectWrapper, { zIndex: 900 }]}>
                            <TouchableOpacity
                                style={styles.selectTrigger}
                                onPress={() => {
                                    setIsDeputySelectOpen(!isDeputySelectOpen);
                                    setIsRoleSelectOpen(false);
                                }}
                            >
                                <Text style={!selectedDeputy ? styles.placeholderText : styles.selectValue}>
                                    {selectedDeputy ? selectedDeputy.full_name : 'Привязать к депутату *'}
                                </Text>
                                <Ionicons
                                    name={isDeputySelectOpen ? "chevron-up" : "chevron-down"}
                                    size={20}
                                    color="#6b7280"
                                />
                            </TouchableOpacity>

                            {isDeputySelectOpen && (
                                <View style={styles.selectDropdown}>
                                    {deputies.length > 0 ? deputies.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={[
                                                styles.selectItem,
                                                selectedDeputy?.id === item.id && styles.selectItemSelected
                                            ]}
                                            onPress={() => {
                                                setSelectedDeputy(item);
                                                setIsDeputySelectOpen(false);
                                            }}
                                        >
                                            <Text style={[
                                                styles.selectItemText,
                                                selectedDeputy?.id === item.id && styles.selectItemTextSelected
                                            ]}>
                                                {item.full_name}
                                            </Text>
                                        </TouchableOpacity>
                                    )) : (
                                        <View style={styles.selectItem}><Text>Депутаты не найдены</Text></View>
                                    )}
                                </View>
                            )}
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.publishButton, isSubmitting && styles.publishButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.publishButtonText}>Создать пользователя</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

// Стили идентичны вашему примеру для соблюдения консистентности
const styles = StyleSheet.create({
    container: { flexGrow: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    backButton: { marginRight: 10, padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
    card: { borderRadius: 16, padding: 20, marginBottom: 20 },
    input: {
        backgroundColor: "#f7f7f7",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        marginBottom: 14,
        marginTop: 8,
    },
    placeholderText: { fontSize: 15, color: "#9ca3af", flex: 1 },
    selectValue: { fontSize: 15, color: "#333", flex: 1 },
    publishButton: {
        backgroundColor: "#0f6319",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 10,
        marginTop: 25,
    },
    publishButtonDisabled: { backgroundColor: "#9ca3af" },
    publishButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    selectWrapper: { marginBottom: 14, marginTop: 8, position: 'relative' },
    selectTrigger: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#f7f7f7",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    selectDropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        maxHeight: 200, // Чтобы список не улетал за экран
    },
    selectItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    selectItemSelected: { backgroundColor: '#f0f7f0' },
    selectItemText: { fontSize: 15, color: '#333' },
    selectItemTextSelected: { color: '#0f6319', fontWeight: '500' },
});

export default CreateUserScreen;
