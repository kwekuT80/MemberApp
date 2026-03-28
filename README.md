# Member Registration App
### React Native (Expo) — converted from Access VBA

A mobile membership registration system for Android (and iOS), converted from the
`modMemberUI_Rebuild` Access database module. All data is stored locally on the device
using SQLite via `expo-sqlite`.

---

## Project Structure

```
MemberApp/
├── App.js                          ← Root entry: DB init + navigation
├── app.json                        ← Expo config
├── package.json
├── babel.config.js
└── src/
    ├── db/
    │   ├── database.js             ← SQLite init, table creation, CRUD helpers
    │   └── memberQueries.js        ← All SQL for members + sub-tables
    ├── navigation/
    │   └── AppNavigator.js         ← React Navigation stack
    ├── screens/
    │   ├── DashboardScreen.js      ← Search + member list
    │   ├── MemberFormScreen.js     ← Tabbed member form (8 tabs)
    │   └── SubformScreens.js       ← Children, Positions, Emergency Contacts,
    │                                  Military, Degrees, Spouse
    ├── components/
    │   └── FormComponents.js       ← Reusable inputs, pickers, buttons, cards
    └── styles/
        └── theme.js                ← Colors, typography, spacing constants
```

---

## Database Schema

Mirrors the Access tables referenced in the VBA source:

| Table                  | Key Fields                                              |
|------------------------|---------------------------------------------------------|
| `tblMembers`           | All bio, contact, employment, degree place fields       |
| `tblChildren`          | ChildName, BirthDate, BirthPlace (FK: MemberID)         |
| `tblPositions`         | PositionTitle, DateFrom, DateTo (FK: MemberID)          |
| `tblEmergencyContacts` | ContactName, Relationship, Phone1, Phone2 (FK: MemberID)|
| `tblMilitary`          | IsMilitary, UniformBlessedDate, CurrentRank… (1-to-1)   |
| `tblDegrees`           | DegreeType, DegreeDate, DegreePlace (FK: MemberID)      |
| `tblSpouse`            | SpouseName, SpouseDOB, AuxiliaryName… (1-to-1)          |
| `tblRegions`           | RegionName (pre-seeded with Ghana's 16 regions)         |
| `tblDegreeTypes`       | DegreeTypeName (pre-seeded: 1st, 2nd & 3rd, 4th, Noble) |

---

## Setup & Running

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Android Studio](https://developer.android.com/studio) (for emulator or device)
  — or the **Expo Go** app on a physical Android device

### Install

```bash
cd MemberApp
npm install
```

### Run on Android

```bash
# Using Expo Go (physical device — easiest)
npx expo start
# Then scan the QR code with Expo Go

# Using Android emulator
npx expo start --android
```

### Build a standalone APK

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Configure build (first time only)
eas build:configure

# Build Android APK
eas build --platform android --profile preview
```

---

## Screen Map

```
Dashboard
  └─ Search + member list
  └─ Tap member → MemberFormScreen (tabbed)
       ├── Bio         — Name, DOB, origin, date joined
       ├── Contact     → Emergency Contacts subscreen
       ├── Family      → Spouse subscreen + Children subscreen
       ├── Employment  — Status, occupation, workplace
       ├── Degrees     → Degree Records subscreen
       ├── Military    → Military Details subscreen
       ├── Positions   → Positions subscreen
       └── Other       — Uniform/Cadet positions (memo)
```

---

## Customisation Notes

- **Regions list**: Edit the `regions` array in `src/db/database.js` to match your locale.
- **Degree types**: Edit the `['1st Degree', ...]` array in the same file.
- **Employment status / Marital status**: Edit the `EMP_STATUS` / `MARITAL` arrays in `MemberFormScreen.js`.
- **Titles**: Edit the `TITLES` array in `MemberFormScreen.js`.
- **Colours / fonts**: All design tokens are in `src/styles/theme.js`.

---

## Access VBA → React Native Mapping

| Access concept         | React Native equivalent                          |
|------------------------|--------------------------------------------------|
| `tblMembers` form      | `MemberFormScreen` (8-tab ScrollView)            |
| Tab control + pages    | Horizontal `ScrollView` tab bar + conditional render |
| Subform controls       | Separate screens navigated via React Navigation  |
| `DoCmd.OpenForm`       | `navigation.navigate('ScreenName', { params })`  |
| `RecordSource`         | `expo-sqlite` queries in `memberQueries.js`      |
| `Dirty = False` (save) | `saveMember()` called on button press            |
| `cboFindMember`        | Search `TextInput` on Dashboard with live query  |
| `MsgBox`               | `Alert.alert()`                                  |
