import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../db/supabase';
import { Colors, Spacing, Typography, Radii, Shadows } from '../styles/theme';

export default function MeetingsScreen({ navigation }) {
  const [viewMode, setViewMode] = useState('list'); // 'list', 'create', 'dashboard'
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [radius, setRadius] = useState('100');
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [isLocating, setIsLocating] = useState(false);

  // Dashboard State
  const [dashboardData, setDashboardData] = useState({
    members: [],
    attendance: [],
    absences: [],
  });

  useEffect(() => {
    fetchMeetings();
  }, []);

  async function fetchMeetings() {
    setLoading(true);
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      Alert.alert('Error fetching meetings', error.message);
    } else {
      setMeetings(data || []);
    }
    setLoading(false);
  }

  const handlePinLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        Alert.alert('Location Error', error.message || 'Ensure location services are enabled.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const handleCreateMeeting = async () => {
    if (!title || !date || !location.latitude || !location.longitude) {
      Alert.alert('Validation Error', 'Please fill all fields and pin location.');
      return;
    }

    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    
    // Fetch commandery ID from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('commandery_id')
      .eq('id', userData?.user?.id)
      .single();

    const commanderyId = profile?.commandery_id;

    if (!commanderyId) {
       Alert.alert('Error', 'Could not determine your Commandery ID');
       setLoading(false);
       return;
    }

    const { error } = await supabase.from('meetings').insert({
      commandery_id: commanderyId,
      title,
      date,
      latitude: location.latitude,
      longitude: location.longitude,
      radius_meters: parseInt(radius, 10) || 100,
    });

    setLoading(false);
    if (error) {
      Alert.alert('Error creating meeting', error.message);
    } else {
      Alert.alert('Success', 'Meeting scheduled!');
      setViewMode('list');
      setTitle('');
      setDate('');
      setLocation({ latitude: null, longitude: null });
      fetchMeetings();
    }
  };

  const loadMeetingDashboard = async (meeting) => {
    setSelectedMeeting(meeting);
    setViewMode('dashboard');
    setLoading(true);

    try {
      // 1. Fetch active members
      const { data: members, error: memError } = await supabase
        .from('members')
        .select('id, first_name, surname, status')
        .eq('commandery_id', meeting.commandery_id)
        .not('status', 'in', '("Dismissed","Transfer-Out","Deceased")');
      if (memError) throw memError;

      // 2. Fetch check-ins
      const { data: attendance, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('meeting_id', meeting.id);
      if (attError) throw attError;

      // 3. Fetch absence requests
      const { data: absences, error: absError } = await supabase
        .from('absence_requests')
        .select('*')
        .eq('meeting_id', meeting.id);
      if (absError) throw absError;

      setDashboardData({
        members: members || [],
        attendance: attendance || [],
        absences: absences || [],
      });
    } catch (e) {
      Alert.alert('Error loading dashboard', e.message);
    }
    setLoading(false);
  };

  const handleManualCheckIn = async (memberId) => {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('attendance').insert({
      meeting_id: selectedMeeting.id,
      member_id: memberId,
      method: 'manual',
      verified_by: userData?.user?.id,
      commandery_id: selectedMeeting.commandery_id,
    });

    if (error) {
      Alert.alert('Check-In Error', error.message);
    } else {
      loadMeetingDashboard(selectedMeeting); // Reload
    }
  };

  const handleAbsenceDecision = async (absenceId, status) => {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('absence_requests')
      .update({ status, reviewed_by: userData?.user?.id })
      .eq('id', absenceId);

    if (error) {
      Alert.alert('Error updating request', error.message);
    } else {
      loadMeetingDashboard(selectedMeeting); // Reload
    }
  };

  // Rendering Helpers
  const renderList = () => (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>Meetings</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Dashboard</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={meetings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => loadMeetingDashboard(item)}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDate}>{new Date(item.date).toLocaleDateString()}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => setViewMode('create')}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCreate = () => (
    <View style={styles.flex}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setViewMode('list')}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Schedule Meeting</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <Text style={styles.label}>Meeting Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Monthly General Meeting"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          placeholder="2026-06-01"
          value={date}
          onChangeText={setDate}
        />

        <Text style={styles.label}>Geofence Radius (meters)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={radius}
          onChangeText={setRadius}
        />

        <View style={styles.locationBox}>
          <Text style={styles.label}>Location Coordinates</Text>
          <Text style={styles.coordText}>
            Lat: {location.latitude || 'Not set'} | Lng: {location.longitude || 'Not set'}
          </Text>
          <TouchableOpacity style={styles.pinBtn} onPress={handlePinLocation} disabled={isLocating}>
            <Text style={styles.pinBtnText}>
              {isLocating ? 'Acquiring GPS...' : '📌 Pin Current Location'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleCreateMeeting}>
          <Text style={styles.submitBtnText}>Schedule Meeting</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderDashboard = () => {
    if (!selectedMeeting) return null;

    const total = dashboardData.members.length;
    const presentCount = dashboardData.attendance.length;
    const excusedCount = dashboardData.absences.filter((a) => a.status === 'approved').length;
    const pendingAbsences = dashboardData.absences.filter((a) => a.status === 'pending');
    
    // Quick safeguard so absent isn't negative
    const absentCount = Math.max(0, total - presentCount - excusedCount);

    const presentWidth = total ? (presentCount / total) * 100 : 0;
    const excusedWidth = total ? (excusedCount / total) * 100 : 0;
    const absentWidth = total ? (absentCount / total) * 100 : 0;

    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setViewMode('list')}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{selectedMeeting.title}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.listContainer}>
          {/* Analytics Chart */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Attendance Overview</Text>
            <View style={styles.statsRow}>
              <Text style={[styles.statText, { color: Colors.chartGreen }]}>Present: {presentCount}</Text>
              <Text style={[styles.statText, { color: Colors.chartBlue }]}>Excused: {excusedCount}</Text>
              <Text style={[styles.statText, { color: Colors.chartRose }]}>Absent: {absentCount}</Text>
            </View>
            <View style={styles.chartBar}>
              {presentWidth > 0 && <View style={[styles.chartSegment, { width: `${presentWidth}%`, backgroundColor: Colors.chartGreen }]} />}
              {excusedWidth > 0 && <View style={[styles.chartSegment, { width: `${excusedWidth}%`, backgroundColor: Colors.chartBlue }]} />}
              {absentWidth > 0 && <View style={[styles.chartSegment, { width: `${absentWidth}%`, backgroundColor: Colors.chartRose }]} />}
            </View>
          </View>

          {/* Pending Absences */}
          {pendingAbsences.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Pending Absence Requests</Text>
              {pendingAbsences.map((req) => {
                const member = dashboardData.members.find((m) => m.id === req.member_id);
                return (
                  <View key={req.id} style={styles.absenceRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rosterName}>{member ? `${member.first_name} ${member.surname}` : 'Unknown'}</Text>
                      <Text style={styles.reasonText}>{req.reason}</Text>
                    </View>
                    <View style={styles.actionBtns}>
                      <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleAbsenceDecision(req.id, 'approved')}>
                        <Text style={styles.btnTextWhite}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleAbsenceDecision(req.id, 'declined')}>
                        <Text style={styles.btnTextWhite}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Roster */}
          <View style={[styles.card, { padding: 0 }]}>
            <Text style={[styles.sectionHeader, { padding: Spacing.md }]}>Live Roster</Text>
            {dashboardData.members.map((member) => {
              const isPresent = dashboardData.attendance.some((a) => a.member_id === member.id);
              const absence = dashboardData.absences.find((a) => a.member_id === member.id);
              
              let statusText = 'Absent';
              let statusColor = Colors.chartRose;
              
              if (isPresent) {
                statusText = 'Present';
                statusColor = Colors.chartGreen;
              } else if (absence?.status === 'approved') {
                statusText = 'Excused';
                statusColor = Colors.chartBlue;
              } else if (absence?.status === 'pending') {
                statusText = 'Excuse Pending';
                statusColor = Colors.grey400;
              }

              return (
                <View key={member.id} style={styles.rosterRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rosterName}>{member.first_name} {member.surname}</Text>
                    <Text style={[styles.rosterStatus, { color: statusColor }]}>{statusText}</Text>
                  </View>
                  {!isPresent && statusText !== 'Excused' && (
                    <TouchableOpacity style={styles.checkInBtn} onPress={() => handleManualCheckIn(member.id)}>
                      <Text style={styles.checkInBtnText}>Check In</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      )}
      {viewMode === 'list' && renderList()}
      {viewMode === 'create' && renderCreate()}
      {viewMode === 'dashboard' && renderDashboard()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.navy },
  flex: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,22,40,0.7)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: Colors.white,
    fontSize: Typography.sizes.xl,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  backBtn: { padding: 8 },
  backBtnText: { color: Colors.gold, fontWeight: '700' },
  listContainer: { padding: Spacing.md },
  card: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.card,
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.navy },
  cardDate: { fontSize: 13, color: Colors.grey400, marginRight: Spacing.md },
  chevron: { fontSize: 24, color: Colors.grey300, fontWeight: '300' },
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
    elevation: 6,
  },
  fabIcon: { fontSize: 32, color: Colors.navy, marginTop: -2 },
  
  // Form
  formContainer: { padding: Spacing.xl, backgroundColor: '#F4F6F8', flexGrow: 1 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.navy, marginBottom: 8, textTransform: 'uppercase' },
  input: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radii.sm,
    marginBottom: Spacing.lg,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.grey200,
  },
  locationBox: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: Radii.sm,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.grey200,
  },
  coordText: { fontSize: 14, color: Colors.grey400, marginBottom: Spacing.md },
  pinBtn: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    padding: 12,
    borderRadius: Radii.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  pinBtnText: { color: Colors.gold, fontWeight: '700' },
  submitBtn: {
    backgroundColor: Colors.navy,
    padding: 16,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  submitBtnText: { color: Colors.white, fontSize: 16, fontWeight: '800' },

  // Dashboard
  sectionHeader: { fontSize: 14, fontWeight: '800', color: Colors.navy, marginBottom: Spacing.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  statText: { fontSize: 13, fontWeight: '700' },
  chartBar: { height: 12, borderRadius: 6, flexDirection: 'row', overflow: 'hidden', backgroundColor: '#F3F4F6' },
  chartSegment: { height: '100%' },
  
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.grey200,
  },
  rosterName: { fontSize: 15, fontWeight: '700', color: Colors.navy },
  rosterStatus: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  checkInBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  checkInBtnText: { color: '#4F46E5', fontWeight: '700', fontSize: 12 },
  
  absenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey200,
  },
  reasonText: { fontSize: 13, color: Colors.grey400, marginTop: 2 },
  actionBtns: { flexDirection: 'row' },
  actionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  approveBtn: { backgroundColor: Colors.chartGreen },
  rejectBtn: { backgroundColor: Colors.chartRose },
  btnTextWhite: { color: Colors.white, fontWeight: '800' },
});
