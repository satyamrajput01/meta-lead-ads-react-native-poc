import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { apiService } from '../services/api.service.js';
import { socketService } from '../services/socket.service.js';
import { Lead } from '../types/index.js';
import { LeadCard } from '../components/LeadCard.js';
import { ConnectionBadge } from '../components/ConnectionBadge.js';

export const LeadsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { status, reconnect } = useSocket();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newestLeadId, setNewestLeadId] = useState<string | null>(null);
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);
  const bannerTimeoutRef = useRef<any>(null);

  // Initial fetch of historical leads for this authenticated user
  useEffect(() => {
    let isMounted = true;

    const fetchInitialLeads = async () => {
      try {
        setLoading(true);
        const data = await apiService.getLeads();
        if (isMounted) {
          setLeads(data.leads || []);
        }
      } catch (err) {
        console.error('Failed to load initial leads:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInitialLeads();

    return () => {
      isMounted = false;
    };
  }, []);

  // Realtime Socket.IO Lead Listener
  // Crucial: Automatically updates state without polling, pull-to-refresh, or user interaction
  useEffect(() => {
    const unsubscribe = socketService.onNewLead((newLead: Lead) => {
      console.log('[LeadsScreen] Received realtime lead via Socket.IO:', newLead);

      // Prepend lead to state immediately
      setLeads((prev) => {
        // Prevent duplicate in UI if already present
        if (prev.some((item) => item.externalMetaLeadId === newLead.externalMetaLeadId || item.id === newLead.id)) {
          return prev;
        }
        return [newLead, ...prev];
      });

      // Highlight newest lead
      setNewestLeadId(newLead.id);

      // Show temporary arrival banner
      setNotificationBanner(`New Meta Lead: ${newLead.name}`);
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
      bannerTimeoutRef.current = setTimeout(() => {
        setNotificationBanner(null);
      }, 5000);
    });

    return () => {
      unsubscribe();
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>LEADS</Text>
            <View style={styles.statusLine}>
              <ConnectionBadge status={status} onReconnect={reconnect} />
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Lead Count Subheader */}
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {leads.length} {leads.length === 1 ? 'Lead' : 'Leads'}
          </Text>
        </View>

        {/* Dynamic New Lead Arrival Banner */}
        {notificationBanner ? (
          <View style={styles.banner}>
            <Text style={styles.bannerIcon}>⚡</Text>
            <Text style={styles.bannerText}>{notificationBanner}</Text>
          </View>
        ) : null}

        {/* Realtime Leads List */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#1877f2" />
            <Text style={styles.loadingText}>Connecting to leads channel...</Text>
          </View>
        ) : leads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIconText}>📬</Text>
            </View>
            <Text style={styles.emptyTitle}>Waiting for leads...</Text>
            <Text style={styles.emptySubtitle}>
              Submit a lead via the Meta Lead Testing Tool. It will appear here automatically in real time without refreshing.
            </Text>
          </View>
        ) : (
          <FlatList
            data={leads}
            keyExtractor={(item: Lead) => item.id || item.externalMetaLeadId}
            renderItem={({ item }: { item: Lead }) => (
              <LeadCard lead={item} isNew={item.id === newestLeadId} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  statusLine: {
    marginTop: 4,
  },
  countRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  countText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  banner: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bannerIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  bannerText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
