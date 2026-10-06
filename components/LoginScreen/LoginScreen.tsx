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
    ScrollView,
    View
} from 'react-native';
import { styles } from './style';
import {Profile} from "@/models/ProfileModel"
import axios from "axios";
import { Eye, EyeOff } from 'lucide-react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotionPressable } from '@/components/ui/Shared/Motion';

import { AuthManager } from '@/api/auth';
import { useTheme } from "@/context/ThemeContext";

interface AuthResponse {
    token: string;
    refresh_token: string;
    user: Profile;
}

const LoginScreen = () => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const reducedMotion = useReducedMotion();
    const passwordInput = useRef<TextInput>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [formError, setFormError] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false);

    const [isEmailFocused, setIsEmailFocused] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(12)).current;
    const formFadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        setIsAuthReady(true);
    }, []);

    useEffect(() => {
        if (!isAuthReady) return;

        const animation = Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: reducedMotion ? 0 : 240,
                useNativeDriver: Platform.OS !== "web",
            }),
            Animated.parallel([
                Animated.timing(formFadeAnim, {
                    toValue: 1,
                    duration: reducedMotion ? 0 : 280,
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: reducedMotion ? 0 : 280,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ])
        ]);
        animation.start();
        return () => animation.stop();
    }, [isAuthReady, reducedMotion, fadeAnim, formFadeAnim, slideAnim]);

    const handleLogin = async () => {
        if (isLoading) return;
        if (!email.trim() || !password) {
            setFormError('Введите электронную почту и пароль');
            return;
        }

        setFormError('');
        setIsLoading(true);
        try {
            const response = await axios.post<AuthResponse>(
                'https://ddc.egd.ru/api/Auth/login',
                {
                    email: email.trim(),
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
            setFormError(error.response?.data?.message || 'Не удалось войти. Проверьте почту и пароль');
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
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }}>

            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <View style={styles.emblemContainer}>
                    <Image
                        style={styles.emblem}
                        resizeMode="contain"
                        source={require('@/assets/images/duma-emblem.png')}
                    />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>Цифровой кабинет{'\n'}депутата</Text>
                <Text style={[styles.subtitle, { color: colors.subtext }]}>Екатеринбургская городская Дума</Text>
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
                <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border, shadowOpacity: isDark ? 0 : 0.04 }]}>
                    <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 6 }}>Вход в аккаунт</Text>
                    <Text style={{ color: colors.subtext, fontSize: 14, lineHeight: 20, marginBottom: 24 }}>События, задачи и документы в одном месте</Text>
                    <View style={styles.inputWrapper}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Электронная почта</Text>
                        <TextInput
                            accessibilityLabel="Электронная почта"
                            placeholder="name@example.ru"
                            placeholderTextColor={colors.subtext}
                            style={[
                                styles.input,
                                { backgroundColor: isDark ? colors.background : '#F9FAFB', borderColor: colors.border, color: colors.text },
                                isEmailFocused && [styles.inputFocused, { borderColor: colors.accent, backgroundColor: colors.card }]
                            ]}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                            editable={!isLoading}
                            autoCorrect={false}
                            returnKeyType="next"
                            onSubmitEditing={() => passwordInput.current?.focus()}
                            submitBehavior="submit"
                            onFocus={() => setIsEmailFocused(true)}
                            onBlur={() => setIsEmailFocused(false)}
                        />
                    </View>

                    <View style={styles.inputWrapper}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Пароль</Text>
                        <View style={[styles.passwordField, { backgroundColor: colors.background, borderColor: isPasswordFocused ? colors.accent : colors.border }]}>
                        <TextInput
                            ref={passwordInput}
                            accessibilityLabel="Пароль"
                            placeholderTextColor={colors.subtext}
                            secureTextEntry={!showPassword}
                            style={[
                                styles.passwordInput,
                                { color: colors.text },
                            ]}
                            value={password}
                            onChangeText={setPassword}
                            autoComplete="password"
                            editable={!isLoading}
                            returnKeyType="go"
                            onSubmitEditing={handleLogin}
                            onFocus={() => setIsPasswordFocused(true)}
                            onBlur={() => setIsPasswordFocused(false)}
                        />
                        <MotionPressable onPress={() => setShowPassword(previous => !previous)} accessibilityLabel={showPassword ? 'Скрыть пароль' : 'Показать пароль'} style={styles.passwordToggle}>
                            {showPassword ? <EyeOff size={20} color={colors.subtext} /> : <Eye size={20} color={colors.subtext} />}
                        </MotionPressable>
                        </View>
                    </View>

                    {!!formError && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.danger, fontSize: 13, lineHeight: 19, marginBottom: 12 }}>{formError}</Text>}
                    <MotionPressable
                        style={[styles.loginButton, { backgroundColor: colors.primary, shadowColor: colors.primary }, isLoading && styles.disabledButton]}
                        onPress={handleLogin}
                        disabled={isLoading}
                        accessibilityLabel={isLoading ? 'Выполняется вход' : 'Войти'}
                    >
                        {isLoading ? (
                            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><ActivityIndicator color="#ffffff" size="small" /><Text style={styles.loginButtonText}>Входим…</Text></View>
                        ) : (
                            <Text style={styles.loginButtonText}>Войти</Text>
                        )}
                    </MotionPressable>

                </View>
            </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export { LoginScreen };
