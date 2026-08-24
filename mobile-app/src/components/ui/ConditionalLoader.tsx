import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

type Props = {
    visible?: boolean;
    message?: string;
};

export default function ConditionalLoader({ visible = true, message }: Props) {
    if (!visible) return null;

    return (
        <View style={styles.overlay} pointerEvents="auto">
            <View style={styles.box}>
                <ActivityIndicator size="large" color="#fff" />
                {message ? <Text style={styles.message}>{message}</Text> : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    box: {
        padding: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
    },
    message: {
        color: '#fff',
        marginTop: 8,
    },
});
