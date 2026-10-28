import { router } from "expo-router";
import React, {useEffect, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Animated, Easing,
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
import Toast from "react-native-toast-message";
import { apiClient } from "@/api/api";

import { AuthManager } from '@/api/auth';
import { useTheme } from "@/context/ThemeContext";

interface AuthResponse {
    token: string;
    refresh_token: string;
    user: Profile;
}

const LoginScreen = () => {
    const { colors, isDark } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false);

    const [isEmailFocused, setIsEmailFocused] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const formFadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        setIsAuthReady(true);
    }, []);

    useEffect(() => {
        if (!isAuthReady) return;

        Animated.sequence([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: Platform.OS !== "web",
            }),
            Animated.parallel([
                Animated.timing(formFadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 500,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ])
        ]).start();
    }, [isAuthReady]);

    const handleLogin = async () => {
        if (!email || !password) {
            Toast.show({
                type: 'error',
                text1: 'Ошибка',
                text2: 'Пожалуйста, заполните все поля'
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await apiClient.post<AuthResponse>(
                '/api/Auth/login',
                {
                    email: email,
                    password: password
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );
            const data = response.data;
            await AuthManager.setAuth(
                data.token,
                data.refresh_token,
                data.user.id,
                // @ts-ignore
                data.user.user_roles || []
            );
            console.log('Успешная авторизация, токены сохранены');

            // Используем router.replace чтобы нельзя было вернуться на логин
            router.replace('/(screens)/DashboardScreen');
        } catch (error: any) {
            console.error('Ошибка авторизации:', error);
            Toast.show({
                type: 'error',
                text1: 'Ошибка',
                text2: error.response?.data?.message || 'Не удалось войти. Проверьте логин и пароль'
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthReady) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={isDark ? colors.text : colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View
                style={[styles.backgroundAccent, { backgroundColor: isDark ? colors.card : '#F3F4F6' }]}
            />

            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <View style={styles.emblemContainer}>
                    <Image
                        style={styles.emblem}
                        resizeMode="contain"
                        source={require('@/assets/images/duma-emblem.png')}
                    />
                </View>
                {/*<Text style={styles.subtitle}>Екатеринбургская городская Дума</Text>*/}
                <Text style={[styles.title, { color: isDark ? colors.text : '#03230e' }]}>Цифровой кабинет{'\n'}депутата</Text>
            </Animated.View>

            <Animated.View
                style={[
                    styles.formContainer,
                    {
                        opacity: formFadeAnim,
                        transform: [{ translateY: slideAnim }]
                    }
                ]}
            >
                <View style={[styles.formCard, { backgroundColor: colors.card, shadowOpacity: isDark ? 0 : 0.08 }]}>
                    <View style={styles.inputWrapper}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Электронная почта</Text>
                        <TextInput
                            placeholderTextColor={colors.subtext}
                            style={[
                                styles.input,
                                { backgroundColor: isDark ? colors.background : '#F9FAFB', borderColor: colors.border, color: colors.text },
                                isEmailFocused && [styles.inputFocused, { borderColor: colors.primary }]
                            ]}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                            onFocus={() => setIsEmailFocused(true)}
                            onBlur={() => setIsEmailFocused(false)}
                        />
                    </View>

                    <View style={styles.inputWrapper}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Пароль</Text>
                        <TextInput
                            placeholderTextColor={colors.subtext}
                            secureTextEntry
                            style={[
                                styles.input,
                                { backgroundColor: isDark ? colors.background : '#F9FAFB', borderColor: colors.border, color: colors.text },
                                isPasswordFocused && [styles.inputFocused, { borderColor: colors.primary }]
                            ]}
                            value={password}
                            onChangeText={setPassword}
                            autoComplete="password"
                            onFocus={() => setIsPasswordFocused(true)}
                            onBlur={() => setIsPasswordFocused(false)}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.loginButton, { backgroundColor: colors.primary, shadowColor: colors.primary }, isLoading && styles.disabledButton]}
                        onPress={handleLogin}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                            <Text style={styles.loginButtonText}>Войти</Text>
                        )}
                    </TouchableOpacity>

                </View>
            </Animated.View>
        </KeyboardAvoidingView>
    );
};

export { LoginScreen };