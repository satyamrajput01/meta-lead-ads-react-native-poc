import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ConnectionStatus } from '../types/index';

interface ConnectionBadgeProps {
  status: ConnectionStatus;
  onReconnect?: () => void;
}

export const ConnectionBadge: React.FC<ConnectionBadgeProps> = ({ status, onReconnect }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return '#10b981'; // Green
      case 'connecting':
        return '#f59e0b'; // Amber
      case 'error':
        return '#ef4444'; // Red
      case 'disconnected':
      default:
        return '#6b7280'; // Gray
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Realtime Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: getStatusColor() }]} />
      <Text style={styles.text}>{getStatusText()}</Text>
      {status === 'disconnected' && onReconnect && (
        <TouchableOpacity onPress={onReconnect} style={styles.retryButton}>
          <Text style={styles.retryText}>Reconnect</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  retryButton: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
  },
  retryText: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: 'bold',
  },
});

