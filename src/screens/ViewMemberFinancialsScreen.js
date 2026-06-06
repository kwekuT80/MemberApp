// src/screens/ViewMemberFinancialsScreen.js
// Admin screen for browsing and selecting members to view their financial data.

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Radii, Shadows } from '../styles/theme';
import { supabase } from '../db/supabase';

export default function ViewMemberFinancialsScreen({ navigation }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, first_name, surname, title, status')
        .eq('status', 'Active')
        .order('surname');

      if (error) throw error;
      setMembers(data || []);
    } catch (e) {
      console.error('Failed to load members:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = searchQuery.trim()
    ? members.filter(m =>
        `${m.first_name} ${m.surname}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.title && m.title.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : members;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>View Member Finances</Text>
      </View>

      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search by name or title..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCapitalize="none"
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filteredMembers.length === 0 ? (
            <Text style={styles.emptyText}>No members found.</Text>
          ) : (
            filteredMembers.map(member => (
              <TouchableOpacity
                key={member.id}
                style={styles.memberCard}
                onPress={() => navigation.navigate('Financials', { memberId: member.id })}
              >
                <View>
                  <Text style={styles.memberName}>{member.title ? `${member.title} ` : ''}{member.surname}</Text>
                  <Text style={styles.memberDetails}>
                    {member.first_name}{member.title ? `, ${member.title}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  backBtn: { marginRight: 8 },
  backBtnText: { color: Colors.gold, fontWeight: '700' },
  title: { color: Colors.white, fontSize: 20, fontWeight: '800', flex: 1, textAlign: 'center' },
  searchInput: { margin: Spacing.md, padding: Spacing.sm, backgroundColor: Colors.white, borderRadius: Radii.md, paddingHorizontal: Spacing.lg, fontSize: 16 },
  list: { padding: Spacing.md },
  memberCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.sm },
  memberName: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  memberDetails: { color: Colors.grey400, fontSize: 13, marginTop: 2 },
  emptyText: { textAlign: 'center', color: Colors.grey500, fontSize: 16, marginTop: 40 },
});
