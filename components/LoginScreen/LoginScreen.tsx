import { apiUrl } from "@/api/api";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from "expo-router";
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { styles } from './style';
import {Profile} from "@/models/ProfileModel"

class AuthManager {
    private static token: string | null = null;
    private static role: string | null = null;
    private static userId: string | null = null; // Добавлено
    private static listeners: ((token: string | null) => void)[] = [];

    static async initialize() {
        try {
            const [token, role, expiry, userId] = await Promise.all([
                AsyncStorage.getItem('authToken'),
                AsyncStorage.getItem('userRole'),
                AsyncStorage.getItem('authTokenExpiry'),
                AsyncStorage.getItem('userId') // Добавлено
            ]);

            if (token && expiry) {
                const now = Date.now();
                if (now < parseInt(expiry, 10)) {
                    this.token = token;
                    this.role = role;
                    this.userId = userId; // Добавлено
                } else {
                    await this.clearAuth();
                }
            }
        } catch (e) {
            console.error('Auth initialization error:', e);
        }
    }

    static getToken() { return this.token; }
    static getRole() { return this.role; }
    static getUserId() { return this.userId; } // Новый метод

    static async setAuth(token: string, userId: string, roles: string[], expiresInDays: number = 30) {
        this.token = token;
        this.userId = userId; // Добавлено
        // @ts-ignore
        this.role = roles.length > 0 ? roles[0].role.name : null;

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiresInDays);
        const expiryTimestamp = expiryDate.getTime().toString();

        try {
            await AsyncStorage.multiSet([
                ['authToken', token],
                ['userId', userId], // Добавлено
                ['userRole', this.role || ''],
                ['authTokenExpiry', expiryTimestamp]
            ]);
        } catch (e) {
            console.error('Error saving auth data:', e);
        }

        this.notifyListeners();
    }

    static async clearAuth() {
        this.token = null;
        this.role = null;
        this.userId = null; // Добавлено
        try {
            await AsyncStorage.multiRemove(['authToken', 'userRole', 'authTokenExpiry', 'userData', 'userId']);
        } catch (e) {
            console.error('Error clearing auth:', e);
        }
        this.notifyListeners();
    }

    static addListener(listener: (token: string | null) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private static notifyListeners() {
        this.listeners.forEach(l => l(this.token));
    }

    static isTokenValid(): boolean {
        return this.token !== null;
    }
}

AuthManager.initialize();

interface AuthResponse {
    token: string;
    user: Profile;
}

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Ошибка', 'Пожалуйста, заполните все поля');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${apiUrl}/api/Auth/login`, {
                method: 'POST',
                headers: {
                    'accept': 'text/plain',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }

            const data: AuthResponse = await response.json();

            // @ts-ignore
            await AuthManager.setAuth(data.token, data.user.id, data.user.user_roles || []);

            await AsyncStorage.setItem('userData', JSON.stringify(data));

            console.log('Успешная авторизация, токен сохранен в глобальное хранилище');
            router.push('/(screens)/DashboardScreen');
        } catch (error) {
            console.error('Ошибка авторизации:', error);
            Alert.alert('Ошибка', 'Не удалось войти. Проверьте логин и пароль');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <Image
                    style={styles.emblem}
                    resizeMode="contain"
                    source={require('@/assets/images/ekb-emblem.png')}
                />
                <Text style={styles.title}>Цифровой кабинет депутата {apiUrl}</Text>
            </View>

            <View style={styles.form}>
                <TextInput
                    placeholder="Email"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                />
                <TextInput
                    placeholder="Пароль"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    autoComplete="password"
                />

                <TouchableOpacity
                    style={[styles.loginButton, isLoading && styles.disabledButton]}
                    onPress={handleLogin}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.loginButtonText}>Войти</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

export { AuthManager, LoginScreen };

