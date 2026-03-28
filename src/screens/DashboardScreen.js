// src/screens/DashboardScreen.js
// Main landing screen: header with stats, search, and member list.

import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, SafeAreaView, ActivityIndicator, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { searchMembers, dbQuery } from '../db/memberQueries';
import { MemberCard, EmptyState } from '../components/FormComponents';
import { Colors, Spacing, Typography, Radii, Shadows } from '../styles/theme';

export default function DashboardScreen({ navigation }) {
  const [query, setQuery]       = useState('');
  const [members, setMembers]   = useState([]);
  const [totalCount, setTotal]  = useState(0);
  const [loading, setLoading]   = useState(false);

  const loadMembers = useCallback(async (text = '') => {
    setLoading(true);
    try {
      const [results, countResult] = await Promise.all([
        searchMembers(text),
        dbQuery(`SELECT COUNT(*) as cnt FROM tblMembers;`),
      ]);
      setMembers(results);
      setTotal(countResult.rows.item(0).cnt);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadMembers(query); }, [query]));

  function handleSearch(text) {
    setQuery(text);
    loadMembers(text);
  }

  function getInitials(item) {
    return [item['First Name'], item['Surname']]
      .filter(Boolean).map(s => s[0].toUpperCase()).join('');
  }

  function getSubtitle(item) {
    return item['Mobile No'] || item['Phone No'] || '';
  }

  function getDisplayName(item) {
    return [item.Title, item['First Name'], item.Surname].filter(Boolean).join(' ') || '(No Name)';
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerEyebrow}>Membership Register</Text>
            <Text style={styles.headerTitle}>Members</Text>
          </View>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => navigation.navigate('MemberForm', { memberId: null })}
            activeOpacity={0.85}
          >
            <Text style={styles.newBtnIcon}>＋</Text>
            <Text style={styles.newBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Stats pill */}
        <View style={styles.statsPill}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{members.length}</Text>
            <Text style={styles.statLabel}>{query ? 'Found' : 'Shown'}</Text>
          </View>
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, phone, mobile…"
            placeholderTextColor={Colors.grey400}
            value={query}
            onChangeText={handleSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── List ── */}
      {loading && members.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.navy} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={item => String(item.ID)}
          contentContainerStyle={[
            styles.listContent,
            members.length === 0 && styles.listContentEmpty,
          ]}
          renderItem={({ item }) => (
            <MemberCard
              initials={getInitials(item)}
              name={getDisplayName(item)}
              subtitle={getSubtitle(item)}
              onPress={() => navigation.navigate('MemberForm', { memberId: item.ID })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={query ? '🔍' : '👥'}
              title={query ? 'No results' : 'No members yet'}
              message={
                query
                  ? `No members match "${query}". Try a different search.`
                  : 'Tap the "+ New" button above to register the first member.'
              }
              actionLabel={query ? 'Clear search' : '+ Add First Member'}
              onAction={query
                ? () => handleSearch('')
                : () => navigation.navigate('MemberForm', { memberId: null })
              }
            />
          }
          refreshing={loading}
          onRefresh={() => loadMembers(query)}
          ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.offWhite },

  header: {
    backgroundColor: Colors.navy,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  headerEyebrow: {
    color: Colors.gold,
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: Typography.sizes.hero,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radii.pill,
    marginTop: 6,
    ...Shadows.card,
  },
  newBtnIcon: { color: Colors.navy, fontSize: 14, fontWeight: '700', marginRight: 4 },
  newBtnText: { color: Colors.navy, fontWeight: '700', fontSize: Typography.sizes.sm, letterSpacing: 0.3 },

  statsPill: {
    flexDirection: 'row',
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.navySubtle,
  },
  statItem: { alignItems: 'center', paddingHorizontal: Spacing.md },
  statValue: { color: Colors.gold, fontSize: Typography.sizes.lg, fontWeight: '800' },
  statLabel: { color: Colors.grey300, fontSize: Typography.sizes.xs, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 1 },
  statDivider: { width: 1, backgroundColor: Colors.navySubtle, marginHorizontal: 4 },

  searchSection: {
    backgroundColor: Colors.navy,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    ...Shadows.card,
  },
  searchIcon:  { fontSize: 15, marginRight: Spacing.sm, opacity: 0.5 },
  searchInput: { flex: 1, fontSize: Typography.sizes.md, color: Colors.grey700 },
  clearBtn:    { padding: 4, marginLeft: Spacing.xs },
  clearBtnText:{ color: Colors.grey400, fontSize: 13 },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  listContentEmpty: { flexGrow: 1, justifyContent: 'center' },
});


