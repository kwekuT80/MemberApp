import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../db/supabase';
import { Colors, Spacing, Typography, Radii, Shadows } from '../styles/theme';

// expo-location is optional — don't crash the app if it's not available in the APK build
let Location = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, node/no-unpublished-require
  Location = require('expo-location');
} catch (e) {
  console.warn('expo-location not available, GPS features will be disabled:', e.message);
}

export default function MeetingsScreen({ navigation }) {
  const [view, setView] = useState('list'); // 'list', 'form', 'dashboard'
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('18:00');
  const [radius, setRadius] = useState('100');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  // Dashboard State
  const [activeMembers, setActiveMembers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (view === 'list') {
      fetchMeetings();
    } else if (view === 'dashboard' && selectedMeeting) {
      fetchMeetingDashboard(selectedMeeting.id);
    }
  }, [view, selectedMeeting]);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      // Get current user's profile to filter by commandery_id
      const { data: userData } = await supabase.auth.getUser();

      // Fetch user's profile/commandery association
      let commanderyId = null;
      if (userData?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('commandery_id, role')
          .eq('id', userData.user.id)
          .single();
        commanderyId = profile?.commandery_id;
      }

      let query = supabase.from('meetings').select('*');

      // If user has a commandery assignment, filter by it
      if (commanderyId) {
        query = query.eq('commandery_id', commanderyId);
      } else if (!userData?.user) {
        // Not logged in — show nothing
        setMeetings([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) {
        Alert.alert('Error', `Failed to load meetings: ${error.message}`);
      } else if (data) {
        setMeetings(data);
      }
    } catch (err) {
      console.error('fetchMeetings error:', err);
      Alert.alert('Error', 'Unable to connect. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetingDashboard = async (meetingId) => {
    setLoading(true);
    const [
      { data: membersData },
      { data: attendanceData },
      { data: requestsData }
    ] = await Promise.all([
      supabase.from('members').select('id, first_name, surname, status').eq('status', 'Active').order('surname'),
      supabase.from('attendance').select('*').eq('meeting_id', meetingId),
      supabase.from('absence_requests').select('*').eq('meeting_id', meetingId)
    ]);

    if (membersData) setActiveMembers(membersData);
    if (attendanceData) setAttendance(attendanceData);
    if (requestsData) setRequests(requestsData);
    setLoading(false);
  };

  const handlePinLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setLat(location.coords.latitude.toString());
      setLng(location.coords.longitude.toString());
    } catch (error) {
      Alert.alert('Error', 'Could not fetch location.');
    }
  };

  const handleScheduleMeeting = async () => {
    if (!title || !date || !time || !lat || !lng) {
      Alert.alert('Validation Error', 'Please fill in all fields including pinning your location.');
      return;
    }

    setLoading(true);
    const meetingDatetime = new Date(`${date}T${time}:00`).toISOString();
    const { error } = await supabase.from('meetings').insert({
      title,
      date: meetingDatetime,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      radius_meters: parseInt(radius, 10),
      status: 'scheduled'
    });

    if (error) {
      Alert.alert('Error', 'Failed to schedule meeting: ' + error.message);
    } else {
      Alert.alert('Success', 'Meeting scheduled successfully!');
      setView('list');
      setTitle('');
      setDate('');
      setTime('');
      setLat('');
      setLng('');
    }
    setLoading(false);
  };

  const handleManualCheckIn = async (memberId) => {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('attendance').insert({
      meeting_id: selectedMeeting.id,
      member_id: memberId,
      status: 'present',
      method: 'manual',
      verified_by: userData?.user?.id
    });
    if (!error) {
      fetchMeetingDashboard(selectedMeeting.id);
    } else {
      Alert.alert('Error', error.message);
    }
  };

  const handleAbsenceAction = async (requestId, newStatus) => {
    const { error } = await supabase
      .from('absence_requests')
      .update({ status: newStatus })
      .eq('id', requestId);
    if (!error) {
      fetchMeetingDashboard(selectedMeeting.id);
    } else {
      Alert.alert('Error', error.message);
    }
  };

  const renderMeetingCard = ({ item }) => {
    const dateObj = new Date(item.date);
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => {
          setSelectedMeeting(item);
          setView('dashboard');
        }}
      >
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardSubtitle}>{dateObj.toLocaleDateString()} @ {dateObj.toLocaleTimeString()}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDashboard = () => {
    if (!selectedMeeting) return null;

    const presentIds = attendance.filter(a => a.status === 'present').map(a => a.member_id);
    const excusedIds = requests.filter(r => r.status === 'approved').map(r => r.member_id);
    
    const presentCount = presentIds.length;
    const excusedCount = excusedIds.length;
    const totalCount = activeMembers.length || 1;
    const absentCount = Math.max(0, totalCount - presentCount - excusedCount);

    const pendingRequests = requests.filter(r => r.status === 'pending');

    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setView('list')}>
          <Text style={styles.backBtnText}>← Back to Meetings</Text>
        </TouchableOpacity>
        
        <View style={styles.header}>
          <Text style={styles.title}>{selectedMeeting.title}</Text>
          <Text style={styles.subtitle}>{new Date(selectedMeeting.date).toLocaleString()}</Text>
        </View>

        <ScrollView style={{ flex: 1, padding: Spacing.md }}>
          {/* Stats Bar */}
          <Text style={styles.sectionHeader}>Attendance Overview</Text>
          <View style={styles.statsBarContainer}>
            <View style={[styles.statsBarSegment, { flex: presentCount, backgroundColor: Colors.chartGreen }]} />
            <View style={[styles.statsBarSegment, { flex: excusedCount, backgroundColor: Colors.gold }]} />
            <View style={[styles.statsBarSegment, { flex: absentCount, backgroundColor: Colors.chartRose }]} />
          </View>
          <View style={styles.statsLegend}>
            <Text style={{color: Colors.chartGreen, fontWeight: '700'}}>Present: {presentCount}</Text>
            <Text style={{color: Colors.gold, fontWeight: '700'}}>Excused: {excusedCount}</Text>
            <Text style={{color: Colors.chartRose, fontWeight: '700'}}>Absent: {absentCount}</Text>
          </View>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <View style={styles.requestsContainer}>
              <Text style={styles.sectionHeader}>Pending Requests ({pendingRequests.length})</Text>
              {pendingRequests.map(req => {
                const member = activeMembers.find(m => m.id === req.member_id);
                return (
                  <View key={req.id} style={styles.requestCard}>
                    <View style={{flex: 1}}>
                      <Text style={styles.requestName}>{member ? `${member.first_name} ${member.surname}` : 'Unknown'}</Text>
                      <Text style={styles.requestReason}>{req.reason}</Text>
                    </View>
                    <View style={{flexDirection: 'row', gap: 8}}>
                      <TouchableOpacity style={[styles.actionBtn, {backgroundColor: Colors.chartGreen}]} onPress={() => handleAbsenceAction(req.id, 'approved')}>
                        <Text style={styles.actionBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, {backgroundColor: Colors.chartRose}]} onPress={() => handleAbsenceAction(req.id, 'rejected')}>
                        <Text style={styles.actionBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Live Roster */}
          <Text style={styles.sectionHeader}>Live Roster</Text>
          {activeMembers.map(member => {
            const isPresent = presentIds.includes(member.id);
            const isExcused = excusedIds.includes(member.id);
            const status = isPresent ? 'PRESENT' : isExcused ? 'EXCUSED' : 'ABSENT';
            
            return (
              <View key={member.id} style={styles.rosterCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rosterName}>{member.first_name} {member.surname}</Text>
                  <Text style={[
                    styles.rosterStatus, 
                    isPresent ? {color: Colors.chartGreen} : isExcused ? {color: Colors.gold} : {color: Colors.chartRose}
                  ]}>{status}</Text>
                </View>
                {status === 'ABSENT' && (
                  <TouchableOpacity style={styles.checkInBtn} onPress={() => handleManualCheckIn(member.id)}>
                    <Text style={styles.checkInBtnText}>Check In</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  };

  const renderForm = () => (
    <ScrollView style={styles.formContainer}>
      <TouchableOpacity style={styles.backBtn} onPress={() => setView('list')}>
        <Text style={styles.backBtnText}>← Back to Meetings</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>Schedule Meeting</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Meeting Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Monthly General Meeting" />
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={date} onChangeText={setDate} />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Time (HH:MM)</Text>
          <TextInput style={styles.input} value={time} onChangeText={setTime} />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Geofence Radius (meters)</Text>
        <TextInput style={styles.input} value={radius} onChangeText={setRadius} keyboardType="numeric" />
      </View>

      <View style={styles.locationBox}>
        <Text style={styles.label}>Location Coordinates</Text>
        <Text style={styles.coordText}>Lat: {lat || 'Not set'} | Lng: {lng || 'Not set'}</Text>
        <TouchableOpacity style={styles.pinBtn} onPress={handlePinLocation}>
          <Text style={styles.pinBtnText}>📌 Pin Current Location</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleScheduleMeeting} disabled={loading}>
        <Text style={styles.submitBtnText}>{loading ? 'Scheduling...' : 'Schedule Meeting'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {view === 'list' && (
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <Text style={styles.title}>Meetings</Text>
            <Text style={styles.subtitle}>Manage Commandery Meetings</Text>
          </View>
          
          {loading ? (
            <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={meetings}
              keyExtractor={item => item.id.toString()}
              renderItem={renderMeetingCard}
              contentContainerStyle={{ padding: Spacing.md }}
              ListEmptyComponent={<Text style={styles.emptyText}>No meetings scheduled.</Text>}
            />
          )}

          <TouchableOpacity style={styles.fab} onPress={() => setView('form')}>
            <Text style={styles.fabIcon}>+</Text>
          </TouchableOpacity>
        </View>
      )}

      {view === 'form' && renderForm()}
      {view === 'dashboard' && renderDashboard()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.navy },
  header: {
    padding: Spacing.lg,
    backgroundColor: Colors.navy,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: { color: Colors.white, fontSize: 24, fontWeight: '800' },
  subtitle: { color: Colors.gold, fontSize: 14, marginTop: 4 },
  
  card: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: Colors.navy },
  cardSubtitle: { fontSize: 14, color: Colors.grey400, marginTop: 4 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
  },
  badgeText: { color: Colors.gold, fontSize: 12, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: Colors.white, marginTop: 20 },

  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  fabIcon: { fontSize: 30, color: Colors.navy, marginTop: -2 },

  formContainer: { flex: 1, padding: Spacing.lg },
  inputGroup: { marginBottom: Spacing.md },
  label: { color: Colors.white, fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: Colors.white, padding: 12, borderRadius: 8, fontSize: 16 },
  
  locationBox: { backgroundColor: 'rgba(255,255,255,0.05)', padding: Spacing.md, borderRadius: Radii.md, marginBottom: Spacing.xl },
  coordText: { color: Colors.gold, fontSize: 14, marginBottom: 12, fontWeight: '600' },
  pinBtn: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 8, alignItems: 'center' },
  pinBtnText: { color: Colors.white, fontWeight: '700' },
  
  submitBtn: { backgroundColor: Colors.gold, padding: 16, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: Colors.navy, fontSize: 16, fontWeight: '800' },

  backBtn: { padding: Spacing.md, paddingBottom: 0 },
  backBtnText: { color: Colors.gold, fontWeight: '700' },

  sectionHeader: { fontSize: 16, fontWeight: '800', color: Colors.navy, marginBottom: 12, marginTop: 20 },
  
  statsBarContainer: { height: 12, flexDirection: 'row', borderRadius: 6, overflow: 'hidden', backgroundColor: '#e5e7eb' },
  statsBarSegment: { height: '100%' },
  statsLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },

  requestsContainer: { backgroundColor: Colors.white, borderRadius: Radii.md, padding: Spacing.md, marginTop: 20 },
  requestCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  requestName: { fontWeight: '700', color: Colors.navy },
  requestReason: { fontSize: 12, color: Colors.grey400, marginTop: 2 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  actionBtnText: { color: Colors.white, fontSize: 12, fontWeight: '700' },

  rosterCard: { backgroundColor: Colors.white, padding: Spacing.md, borderRadius: Radii.md, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rosterName: { fontWeight: '700', color: Colors.navy },
  rosterStatus: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  checkInBtn: { backgroundColor: Colors.navy, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  checkInBtnText: { color: Colors.gold, fontWeight: '700', fontSize: 12 },
});
