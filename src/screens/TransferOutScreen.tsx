import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../db/supabase';
import { Colors, Spacing, Typography, Shadows, Radii } from '../styles/theme';

const COMMANDERIES = [
  { id: '747', name: 'SS. Peter & Paul Commandery (#747)', date: '2012-10-04' },
  { id: '825', name: 'Our Lady Star of the Sea Commandery (#825)', date: '2014-12-20' },
];

export default function TransferOutScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [selectedCommandery, setSelectedCommandery] = useState(COMMANDERIES[0]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    fetchUnassignedEntries();
  }, []);

  async function fetchUnassignedEntries() {
    setLoading(true);
    const { data, error } = await supabase
      .from('roll_book_entries')
      .select('*')
      .is('enrolled_member_id', null)
      .order('raw_name', { ascending: true });

    if (error) {
      console.error('Error fetching unassigned entries:', error);
      Alert.alert('Error', 'Could not load unassigned members.');
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  }

  const toggleSelection = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map(e => e.id)));
    }
  };

  const processTransfers = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('No Selection', 'Please select at least one member to transfer.');
      return;
    }

    Alert.alert(
      'Confirm Transfers',
      `Transfer ${selectedIds.size} members to ${selectedCommandery.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Proceed', 
          style: 'destructive',
          onPress: executeTransfers 
        }
      ]
    );
  };

  const executeTransfers = async () => {
    setProcessing(true);
    let successCount = 0;
    
    // Get the active user to assign ownership
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      Alert.alert('Auth Error', 'Could not verify active session.');
      setProcessing(false);
      return;
    }

    const selectedEntries = entries.filter(e => selectedIds.has(e.id));

    for (const entry of selectedEntries) {
      try {
        const rawName = (entry.raw_name || '').trim();
        const parts = rawName.split(/\s+/);
        let surname = parts[0] || 'Unknown';
        let firstName = parts.slice(1).join(' ') || '';
        if (!firstName) firstName = surname; // Fallback if single name

        const newMember = {
          user_id: user.id,
          surname: surname,
          first_name: firstName,
          full_name: rawName, // Keep original intact just in case
          date_joined: entry.date_of_initiation || null,
          status: 'Transfer-Out',
          transfer_to: selectedCommandery.name,
          transfer_date: selectedCommandery.date,
          gender: 'Male', // Defaulting to Male for Commandery
        };

        const { data: memberData, error: memberErr } = await supabase
          .from('members')
          .insert([newMember])
          .select('id')
          .single();

        if (memberErr) throw memberErr;

        if (memberData && memberData.id) {
          const { error: updateErr } = await supabase
            .from('roll_book_entries')
            .update({ enrolled_member_id: memberData.id })
            .eq('id', entry.id);

          if (updateErr) throw updateErr;
          
          successCount++;
        }
      } catch (err) {
        console.error('Failed to transfer entry:', entry.id, err.message);
      }
    }

    setProcessing(false);
    setSelectedIds(new Set());
    Alert.alert('Complete', `Successfully transferred ${successCount} out of ${selectedEntries.length} members.`);
    fetchUnassignedEntries(); // Refresh list
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <TouchableOpacity 
        style={[styles.listItem, isSelected && styles.listItemSelected]}
        onPress={() => toggleSelection(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.nameText}>{item.raw_name || 'Unknown'}</Text>
          <Text style={styles.dateText}>Initiated: {item.date_of_initiation || 'N/A'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>{"< "}Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Process Transfers</Text>
      </View>

      <View style={styles.settingsCard}>
        <Text style={styles.label}>Destination Commandery:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedCommandery.id}
            onValueChange={(itemValue) => {
              const cmd = COMMANDERIES.find(c => c.id === itemValue);
              if (cmd) setSelectedCommandery(cmd);
            }}
            style={styles.picker}
            dropdownIconColor={Colors.gold}
          >
            {COMMANDERIES.map(cmd => (
              <Picker.Item key={cmd.id} label={cmd.name} value={cmd.id} color={Colors.white} />
            ))}
          </Picker>
        </View>
        <Text style={styles.effDateText}>
          Effective Date: {selectedCommandery.date}
        </Text>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.subTitle}>Unassigned Members ({entries.length})</Text>
        <TouchableOpacity onPress={selectAll} style={styles.selectAllBtn}>
          <Text style={styles.selectAllText}>
            {selectedIds.size === entries.length && entries.length > 0 ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No unassigned members available.</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.processBtn, selectedIds.size === 0 && styles.processBtnDisabled]}
          onPress={processTransfers}
          disabled={selectedIds.size === 0 || processing}
        >
          {processing ? (
            <ActivityIndicator color={Colors.black} />
          ) : (
            <Text style={styles.processBtnText}>
              Transfer Selected ({selectedIds.size})
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.navyBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Colors.navySurface,
  },
  backBtn: {
    marginRight: Spacing.m,
    padding: Spacing.xs,
  },
  backBtnText: {
    color: Colors.gold,
    fontSize: Typography.sizes.m,
    fontWeight: Typography.weights.semiBold,
  },
  title: {
    color: Colors.white,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  settingsCard: {
    backgroundColor: Colors.navySurface,
    margin: Spacing.m,
    padding: Spacing.m,
    borderRadius: Radii.m,
    ...Shadows.medium,
  },
  label: {
    color: Colors.grey300,
    fontSize: Typography.sizes.s,
    marginBottom: Spacing.xs,
    fontWeight: Typography.weights.semiBold,
  },
  pickerContainer: {
    backgroundColor: Colors.navyBackground,
    borderRadius: Radii.s,
    borderWidth: 1,
    borderColor: Colors.navyBorder,
    marginBottom: Spacing.s,
  },
  picker: {
    color: Colors.white,
    height: 50,
  },
  effDateText: {
    color: Colors.gold,
    fontSize: Typography.sizes.s,
    fontWeight: Typography.weights.semiBold,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    marginBottom: Spacing.s,
  },
  subTitle: {
    color: Colors.white,
    fontSize: Typography.sizes.l,
    fontWeight: Typography.weights.semiBold,
  },
  selectAllBtn: {
    padding: Spacing.xs,
  },
  selectAllText: {
    color: Colors.gold,
    fontWeight: Typography.weights.semiBold,
  },
  listContent: {
    paddingHorizontal: Spacing.m,
    paddingBottom: Spacing.xl,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navySurface,
    padding: Spacing.m,
    borderRadius: Radii.s,
    marginBottom: Spacing.s,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  listItemSelected: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(201, 168, 76, 0.1)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.grey400,
    marginRight: Spacing.m,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold,
  },
  checkmark: {
    color: Colors.black,
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemContent: {
    flex: 1,
  },
  nameText: {
    color: Colors.white,
    fontSize: Typography.sizes.m,
    fontWeight: Typography.weights.semiBold,
    marginBottom: 2,
  },
  dateText: {
    color: Colors.grey400,
    fontSize: Typography.sizes.s,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.grey400,
    fontSize: Typography.sizes.m,
  },
  footer: {
    padding: Spacing.m,
    borderTopWidth: 1,
    borderTopColor: Colors.navySurface,
    backgroundColor: Colors.navyBackground,
  },
  processBtn: {
    backgroundColor: Colors.gold,
    padding: Spacing.m,
    borderRadius: Radii.m,
    alignItems: 'center',
  },
  processBtnDisabled: {
    backgroundColor: Colors.grey500,
  },
  processBtnText: {
    color: Colors.black,
    fontSize: Typography.sizes.m,
    fontWeight: Typography.weights.bold,
  }
});
