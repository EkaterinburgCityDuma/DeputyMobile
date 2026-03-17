import React from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Keyboard,
    TouchableWithoutFeedback,
} from 'react-native';
import { styles } from './file-manager-screen';
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CreateCatalogModalProps {
    visible: boolean;
    catalogName: string;
    creatingCatalog: boolean;
    createError: string | null;
    onClose: () => void;
    onNameChange: (name: string) => void;
    onCreate: () => void;
}

export function CreateCatalogModal({
                                       visible,
                                       catalogName,
                                       creatingCatalog,
                                       createError,
                                       onClose,
                                       onNameChange,
                                       onCreate
                                   }: CreateCatalogModalProps) {
    const insets = useSafeAreaInsets();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={'padding'}
                        style={styles.keyboardView}
                    >
                        <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}>
                            <Text style={styles.modalTitle}>Создать каталог</Text>

                            <TextInput
                                style={styles.modalInput}
                                placeholder="Название каталога"
                                value={catalogName}
                                onChangeText={onNameChange}
                                placeholderTextColor="#9ca3af"
                                editable={!creatingCatalog}
                                autoFocus={visible}
                                returnKeyType="done"
                                onSubmitEditing={onCreate}
                            />

                            {createError && (
                                <Text style={styles.modalError}>{createError}</Text>
                            )}

                            <View style={styles.modalButtonsContainer}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.modalButtonCancel]}
                                    onPress={onClose}
                                    disabled={creatingCatalog}
                                >
                                    <Text style={styles.modalButtonCancelText}>Отмена</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalButton, styles.modalButtonCreate]}
                                    onPress={onCreate}
                                    disabled={creatingCatalog}
                                >
                                    {creatingCatalog ? (
                                        <ActivityIndicator size="small" color="#ffffff" />
                                    ) : (
                                        <Text style={styles.modalButtonCreateText}>Создать</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
