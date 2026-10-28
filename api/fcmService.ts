import {PermissionsAndroid, Platform} from 'react-native';
import {apiClient} from "@/api/api";
import {
    AuthorizationStatus,
    getMessaging,
    getToken,
    requestPermission,
    setBackgroundMessageHandler
} from '@react-native-firebase/messaging';

const messagingInstance = getMessaging();

export const registerDeviceToken = async (fcmToken: string) => {
    try {
        return await apiClient.post('/api/device/register', {
            token: fcmToken,
            platform: Platform.OS
        }, {
            headers: {
                'accept': '*/*',
                'Content-Type': 'application/json',
            }
        });
    } catch (e) {
        console.error("Device register error:", e);
        return null;
    }
}

export async function requestUserPermission() {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
        const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
        if (await PermissionsAndroid.check(permission)) return true;
        return await PermissionsAndroid.request(permission) === PermissionsAndroid.RESULTS.GRANTED;
    }
    const authStatus = await requestPermission(messagingInstance);
    const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

    if (enabled) {
        console.log('Authorization status:', authStatus);
    }
    return enabled;
}

export async function getFCMToken() {
    try {
        const fcmToken = await getToken(messagingInstance);
        if (fcmToken) {
            console.log('FCM Token:', fcmToken);
            return fcmToken;
        } else {
            console.log('Failed', 'No token received');
            return null;
        }
    } catch (error) {
        console.error('Error getting FCM token:', error);
        return null;
    }
}

setBackgroundMessageHandler(messagingInstance, async remoteMessage => {
    // Здесь можно выполнить логику, например, обновить бейдж или сохранить в сторадж
});
