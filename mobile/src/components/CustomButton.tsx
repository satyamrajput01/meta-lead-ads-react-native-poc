import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  disabled?: boolean;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  loading = false,
  variant = 'primary',
  disabled = false,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return '#d1d5db';
    switch (variant) {
      case 'primary':
        return '#1877f2'; // Meta blue
      case 'secondary':
        return '#3b82f6';
      case 'danger':
        return '#ef4444';
      case 'outline':
        return 'transparent';
      default:
        return '#1877f2';
    }
  };

  const getTextColor = () => {
    if (disabled) return '#9ca3af';
    if (variant === 'outline') return '#1877f2';
    return '#ffffff';
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        variant === 'outline' && styles.outlineBorder,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
    paddingHorizontal: 16,
  },
  outlineBorder: {
    borderWidth: 1.5,
    borderColor: '#1877f2',
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
});

