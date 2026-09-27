import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lead } from '../types/index.js';

interface LeadCardProps {
  lead: Lead;
  isNew?: boolean;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, isNew = false }) => {
  const formatTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString();
    } catch {
      return timeStr || 'Just now';
    }
  };

  return (
    <View style={[styles.card, isNew && styles.newCardBorder]}>
      {/* Top row: Name & New indicator */}
      <View style={styles.headerRow}>
        <Text style={styles.name}>{lead.name || 'Lead'}</Text>
        {isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>

      {/* Details: Email, Phone, Company */}
      <View style={styles.detailsBlock}>
        {lead.email ? (
          <Text style={styles.detailText}>{lead.email}</Text>
        ) : null}

        {lead.phone ? (
          <Text style={styles.detailText}>{lead.phone}</Text>
        ) : null}

        {lead.company ? (
          <Text style={styles.companyText}>{lead.company}</Text>
        ) : null}
      </View>

      {/* Footer: Time & Meta Lead ID */}
      <View style={styles.footerRow}>
        <Text style={styles.timeText}>{formatTime(lead.createdTime || lead.createdAt)}</Text>
        <Text style={styles.metaIdText}>Meta ID: {(lead.externalMetaLeadId || lead.id)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  newCardBorder: {
    borderColor: '#10b981',
    borderWidth: 2,
    backgroundColor: '#f0fdf4',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  newBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailsBlock: {
    marginBottom: 8,
    gap: 3,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  companyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1d4ed8',
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  timeText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  metaIdText: {
    fontSize: 11,
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
});
