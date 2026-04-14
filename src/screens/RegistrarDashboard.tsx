import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../db/supabase';
import { getDashboardInsights, getBirthdayReminders } from '../db/memberQueries';
import { Colors, Spacing, Typography, Radii, Shadows } from '../styles/theme';

export default function RegistrarDashboard({ navigation }) {
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter States
  const [rankFilter, setRankFilter] = useState('All');
  const [profFilter, setProfFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // New State for Upgrades
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'insights'
  const [insights, setInsights] = useState(null);
  const [birthdays, setBirthdays] = useState([]);

  useEffect(() => {
    // Refresh members list when the screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchMembers();
      loadUpgrades();
    });
    fetchMembers();
    loadUpgrades();
    
    return unsubscribe;
  }, [navigation]);

  async function fetchMembers() {
    setLoading(true);
    // Fetch members with children count and top positions
    const { data, error } = await supabase
      .from('members')
      .select('*, children(id), positions(position_title, date_from, date_to)')
      .order('surname', { ascending: true });
      
    if (error) {
      console.error('Error fetching members:', error);
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  }

  async function loadUpgrades() {
    try {
      const [ins, bdays] = await Promise.all([
        getDashboardInsights(),
        getBirthdayReminders(),
      ]);
      setInsights(ins);
      setBirthdays(bdays);
    } catch (e) {
      console.warn('Upgrades load failed:', e.message);
    }
  }

  const filteredMembers = members.filter(item => {
    // 1. Text Search
    const query = searchQuery.toLowerCase().trim();
    const fullName = `${item.first_name || ''} ${item.surname || ''}`.toLowerCase();
    const phone = String(item.phone || item.mobile || '').toLowerCase();
    const textMatch = !query || fullName.includes(query) || phone.includes(query);

    // 2. Marital Status Filter
    const statusMatch = statusFilter === 'All' || item.marital_status === statusFilter;

    // 3. Profession Filter (Matches general job titles)
    const profMatch = profFilter === 'All' || 
      (item.occupation || '').toLowerCase().includes(profFilter.toLowerCase()) ||
      (item.job_status || '').toLowerCase().includes(profFilter.toLowerCase());

    // 4. Rank/Position Filter
    const hasRank = (item.positions || []).some(p => 
      p.position_title?.toLowerCase().includes(rankFilter.toLowerCase())
    );
    const rankMatch = rankFilter === 'All' || hasRank;

    return textMatch && statusMatch && profMatch && rankMatch;
  });

  const renderItem = ({ item }) => {
    const displayName =
      String(item.full_name  || '').trim() ||
      `${String(item.first_name || '')} ${String(item.surname || '')}`.trim() ||
      'Unknown Member';

    const phone = String(item.phone || item.mobile || '').trim();
    
    // Determine the most relevant leadership tag
    const posList = [...(item.positions || [])].sort((a, b) => 
      String(b.date_from || '').localeCompare(String(a.date_from || ''))
    );
    
    // Prioritize a position with no 'date_to' (current)
    const currentPos = posList.find(p => !p.date_to);
    const latestPos  = posList[0];
    
    let leadershipTag = null;
    if (currentPos) {
      const year = currentPos.date_from ? `'${currentPos.date_from.split('-')[0].slice(-2)}` : '';
      leadershipTag = `${currentPos.position_title} ${year}`.trim();
    } else if (latestPos) {
      leadershipTag = `Past ${latestPos.position_title}`;
    }

    const childCount = (item.children || []).length;

    return (
      <TouchableOpacity
        style={styles.listItem}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('MemberForm', { mode: 'edit', memberId: item.id })}
      >
        <View style={styles.itemContent}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{displayName}</Text>
            {childCount > 0 && (
              <View style={styles.childBadge}>
                <Text style={styles.childBadgeText}>👶 {childCount}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.detailsRow}>
            {item.status && item.status !== 'Active' && (
              <View style={[
                styles.statusBadge, 
                item.status === 'Deceased' && styles.statusDeceased,
                item.status === 'Dismissed' && styles.statusSacked,
                item.status === 'Suspended' && styles.statusSuspended,
                item.status === 'Transfer-Out' && styles.statusOut,
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  item.status === 'Deceased' && styles.statusDeceasedText
                ]}>
                  {item.status === 'Deceased' ? '🕯️ RIP' : 
                   item.status === 'Dismissed' ? 'DISMISSED' : 
                   item.status.toUpperCase()}
                </Text>
              </View>
            )}
            {leadershipTag ? (
              <View style={styles.positionBadge}>
                <Text style={styles.positionBadgeText}>{leadershipTag}</Text>
              </View>
            ) : null}
            <Text style={[styles.contactLabel, !phone && styles.contactLabelMissing]}>
              {phone || 'No phone added'}
            </Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>All Registered Members</Text>
        </View>
        <TouchableOpacity 
          style={styles.headerReportBtn} 
          onPress={() => navigation.navigate('Reports')}
        >
          <Text style={styles.headerReportBtnText}>Reports</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone..."
            placeholderTextColor={Colors.grey400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          <TouchableOpacity 
            style={[styles.filterBtn, showFilters && styles.filterBtnActive]} 
            onPress={() => setShowFilters(!showFilters)}
          >
            <Text style={[styles.filterBtnText, showFilters && styles.filterBtnTextActive]}>
              {showFilters ? 'Hide Filters' : 'Filters'}
            </Text>
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filterPanel}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Profession:</Text>
                {['All', 'Retired', 'Lawyer', 'Engineer', 'Banker'].map(p => (
                  <TouchableOpacity 
                    key={p} 
                    onPress={() => setProfFilter(p)}
                    style={[styles.filterChip, profFilter === p && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, profFilter === p && styles.filterChipTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Leadership:</Text>
                {['All', 'President', 'Secretary', 'Treasurer', 'Commander'].map(r => (
                  <TouchableOpacity 
                    key={r} 
                    onPress={() => setRankFilter(r)}
                    style={[styles.filterChip, rankFilter === r && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, rankFilter === r && styles.filterChipTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* TABS SELECTOR */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'list' && styles.tabItemActive]}
          onPress={() => setActiveTab('list')}
        >
          <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>Member List</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'insights' && styles.tabItemActive]}
          onPress={() => setActiveTab('insights')}
        >
          <Text style={[styles.tabText, activeTab === 'insights' && styles.tabTextActive]}>Commandery Insights</Text>
        </TouchableOpacity>
      </View>

      {/* BIRTHDAY BANNER */}
      {birthdays.length > 0 && (
        <View style={styles.birthdayContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {birthdays.map((b, i) => (
              <View key={i} style={styles.birthdayCard}>
                <Text style={styles.birthdayIcon}>🎂</Text>
                <Text style={styles.birthdayText}>
                  Birthday Today: <Text style={styles.birthdayName}>{b.title} {b.first_name} {b.surname}</Text>
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      
      {loading ? (
        <ActivityIndicator size="large" color={Colors.gold} style={styles.loader} />
      ) : activeTab === 'insights' ? (
        <InsightsView insights={insights} />
      ) : filteredMembers && filteredMembers.length > 0 ? (
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.listContainer}>
          <Text style={styles.emptyText}>
            {searchQuery.length > 0 
              ? `No members match "${searchQuery}"`
              : "No Members Found"}
          </Text>
        </View>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('MemberForm', { memberId: null })}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function InsightsView({ insights }) {
  if (!insights) return (
    <View style={styles.insightsEmpty}>
      <Text style={styles.insightsEmptyText}>Calculating Commandery Insights...</Text>
    </View>
  );

  return (
    <ScrollView style={styles.insightsScroll} contentContainerStyle={styles.insightsContent}>
      <Text style={styles.sectionHeader}>Commandery Health</Text>
      <View style={styles.statGrid}>
        <InsightCard title="Total Brothers" value={insights.totalMembers} icon="👥" color={Colors.chartBlue} />
        <InsightCard title="Active" value={insights.statusDistribution['Active'] || 0} icon="✅" color={Colors.chartGreen} />
      </View>

      <Text style={styles.sectionHeader}>Status Breakdown</Text>
      <View style={styles.glassList}>
        {Object.entries(insights.statusDistribution).map(([label, count]) => (
          <View key={label} style={styles.progressRow}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>{label}</Text>
              <Text style={styles.progressValue}>{count}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${(count / insights.totalMembers) * 100}%`, backgroundColor: label === 'Active' ? Colors.chartGreen : Colors.chartRose }]} />
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.sectionHeader}>Major Professions</Text>
      <View style={styles.profGrid}>
        {Object.entries(insights.professionGrowth).sort((a,b) => b[1] - a[1]).slice(0, 4).map(([prof, count]) => (
          <View key={prof} style={styles.profCard}>
            <Text style={styles.profCount}>{count}</Text>
            <Text style={styles.profName} numberOfLines={1}>{prof}</Text>
          </View>
        ))}
      </View>
      
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function InsightCard({ title, value, icon, color }) {
  return (
    <View style={[styles.insightCard, { borderLeftColor: color }]}>
      <Text style={styles.insightIcon}>{icon}</Text>
      <View>
        <Text style={styles.insightValue}>{value}</Text>
        <Text style={styles.insightTitle}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  header: {
    padding: Spacing.xl,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.navy,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerReportBtn: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  headerReportBtnText: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.white,
    fontSize: Typography.sizes.xxl,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.gold,
    fontSize: Typography.sizes.sm,
    marginTop: 4,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: Spacing.md,
    backgroundColor: '#F4F6F8',
    flexGrow: 1,
  },
  searchContainer: {
    backgroundColor: Colors.navy,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: Spacing.sm,
    opacity: 0.6,
  },
  searchInput: {
    flex: 1,
    color: Colors.white,
    fontSize: Typography.sizes.md,
    fontWeight: '500',
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: 8,
  },
  filterBtnActive: {
    backgroundColor: Colors.gold,
  },
  filterBtnText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  filterBtnTextActive: {
    color: Colors.navy,
  },
  filterPanel: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginRight: 10,
    width: 75,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: Colors.gold,
  },
  filterChipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: Colors.gold,
    fontWeight: '700',
  },
  clearIcon: {
    color: Colors.grey400,
    fontSize: 16,
    padding: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingVertical: 18,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  itemContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.navy,
  },
  childBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: Spacing.sm,
  },
  childBadgeText: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '700',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  positionBadge: {
    backgroundColor: Colors.goldFaint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.goldPale,
  },
  positionBadgeText: {
    fontSize: 11,
    color: '#856404',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  contactLabel: {
    fontSize: 12,
    color: Colors.grey400,
  },
  contactLabelMissing: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
  chevron: {
    fontSize: 24,
    color: Colors.grey300,
    fontWeight: '300',
    marginLeft: Spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    color: Colors.grey400,
    fontSize: Typography.sizes.md,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lifted,
    elevation: 6, // Dedicated android shadow
  },
  fabIcon: {
    fontSize: 32,
    color: Colors.navy,
    fontWeight: '400',
    marginTop: -2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: Spacing.sm,
    backgroundColor: '#E5E7EB',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#344054',
    textTransform: 'uppercase',
  },
  statusDeceased: { backgroundColor: '#111827' },
  statusDeceasedText: { color: '#F3F4F6' },
  statusSacked: { backgroundColor: '#FEE2E2' },
  statusSackedText: { color: '#991B1B' },
  statusSuspended: { backgroundColor: '#FEF3C7' },
  statusSuspendedText: { color: '#92400E' },
  statusOut: { backgroundColor: '#DBEAFE' },

  // UPGRADE STYLES
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.navy,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  tabItem: {
    marginRight: Spacing.lg,
    paddingBottom: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: Colors.gold,
  },
  tabText: {
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  tabTextActive: {
    color: Colors.white,
  },

  birthdayContainer: {
    backgroundColor: Colors.navy,
    paddingBottom: Spacing.md,
  },
  birthdayCard: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radii.pill,
    marginLeft: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  birthdayIcon: { fontSize: 16, marginRight: 8 },
  birthdayText: { color: Colors.goldPale, fontSize: 12 },
  birthdayName: { fontWeight: '800', color: Colors.gold },

  insightsScroll: { flex: 1, backgroundColor: '#F4F6F8' },
  insightsContent: { padding: Spacing.lg },
  sectionHeader: { fontSize: 13, fontWeight: '800', color: Colors.grey400, textTransform: 'uppercase', marginBottom: 12, marginTop: 10 },
  statGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  insightCard: {
    flex: 0.48,
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    ...Shadows.card,
  },
  insightIcon: { fontSize: 24, marginRight: 12 },
  insightValue: { fontSize: 20, fontWeight: '800', color: Colors.navy },
  insightTitle: { fontSize: 11, color: Colors.grey400, fontWeight: '600' },

  glassList: {
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  progressRow: { marginBottom: 16 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: Colors.navy },
  progressValue: { fontSize: 12, fontWeight: '800', color: Colors.grey400 },
  progressBarBg: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },

  profGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  profCard: {
    width: '48%',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: 12,
    alignItems: 'center',
    ...Shadows.card,
  },
  profCount: { fontSize: 24, fontWeight: '800', color: Colors.gold, marginBottom: 2 },
  profName: { fontSize: 12, color: Colors.navy, fontWeight: '700' },

  insightsEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F6F8' },
  insightsEmptyText: { color: Colors.grey400, fontSize: 14, fontWeight: '600' },
});
