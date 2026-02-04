# Real-Time Collaboration Features

## Overview
The app now supports real-time collaborative editing using Firebase Firestore, allowing multiple users to work on the same 3D model simultaneously.

## Features Implemented

### 1. **Real-Time Sync**
- All changes to code, messages, and 3D models sync instantly across all connected users
- Uses Firestore's `onSnapshot` listeners for live updates
- No polling or manual refresh needed

### 2. **Share Button**
- Located in the top toolbar (link icon)
- Generates a shareable link for the current session
- Anyone with the link can view and collaborate
- Link format: `https://your-domain.com/{sessionId}`

### 3. **Collaborators Panel**
- Shows all active users working on the session
- Displays user name, email, and colored indicator
- Appears in the top-right corner when collaborators are present
- Each collaborator gets a unique color for identification

### 4. **Activity Tracking**
- Tracks when users join and leave
- Updates activity status every 30 seconds
- Automatically removes inactive collaborators
- Shows pulsing indicator for active users

### 5. **Comments/Tags** (Backend Ready)
- Infrastructure for adding comments and tags to sessions
- Can be attached to specific code lines
- Stored in Firestore subcollection: `sessions/{sessionId}/comments`

## How It Works

### For Session Owner:
1. Create or open a session
2. Click the "Share" button (link icon) in the toolbar
3. Copy the generated link
4. Share the link with collaborators

### For Collaborators:
1. Open the shared link
2. Sign in (required for collaboration)
3. Start editing - changes sync automatically
4. See other collaborators in the top-right panel

## Technical Details

### Firebase Structure
```
sessions/{sessionId}
  ├── userId: string (owner)
  ├── title: string
  ├── messages: array
  ├── modelCode: string
  ├── isShared: boolean
  ├── sharedWith: array<userId>
  ├── collaborators: array<CollaboratorInfo>
  │   ├── userId
  │   ├── displayName
  │   ├── email
  │   ├── color
  │   ├── joinedAt
  │   └── lastActive
  └── comments/{commentId}
      ├── userId
      ├── userName
      ├── content
      ├── timestamp
      └── position (optional)
```

### Security Rules
- Session owner has full control
- Shared sessions allow read/write for authenticated users
- Users in `sharedWith` array have explicit access
- Comments can be created by any authenticated user
- Only comment author can update/delete their comments

### Real-Time Updates
- **Code changes**: Synced via `modelCode` field
- **Messages**: Synced via `messages` array
- **Collaborators**: Synced via `collaborators` array
- **Activity**: Updated every 30 seconds
- **Cleanup**: Collaborators removed on disconnect

## Components

### ShareButton.tsx
- Generates shareable links
- Copies link to clipboard
- Shows success/error notifications

### CollaboratorsPanel.tsx
- Displays active collaborators
- Shows colored indicators
- Positioned in top-right corner

### AIChatPanel.tsx (Enhanced)
- Real-time message sync
- Collaborator presence tracking
- Auto-cleanup on unmount

### App.tsx (Enhanced)
- Subscribes to session updates
- Manages collaborator state
- Renders CollaboratorsPanel

## Usage Example

```typescript
// Subscribe to session updates
const unsubscribe = subscribeToSession(sessionId, (session) => {
  if (session) {
    // Update UI with new data
    setMessages(session.messages);
    setCollaborators(session.collaborators);
    setCode(session.modelCode);
  }
});

// Add collaborator
await addCollaborator(sessionId, {
  userId: user.uid,
  displayName: user.displayName,
  email: user.email,
  color: '#FF6B6B'
});

// Update activity
await updateCollaboratorActivity(sessionId, user.uid);

// Remove collaborator
await removeCollaborator(sessionId, user.uid);

// Cleanup
unsubscribe();
```

## Benefits

1. **No Additional Dependencies**: Uses existing Firebase setup
2. **Automatic Authentication**: Leverages Firebase Auth
3. **Real-Time**: Sub-second latency for updates
4. **Scalable**: Firebase handles all the infrastructure
5. **Secure**: Firestore security rules protect data
6. **Offline Support**: Firebase handles offline/online transitions

## Future Enhancements

- [ ] Cursor position sharing
- [ ] Code selection highlighting
- [ ] Voice/video chat integration
- [ ] Conflict resolution for simultaneous edits
- [ ] Version history and rollback
- [ ] Collaborative annotations on 3D model
- [ ] Chat within the session
- [ ] Permissions (view-only, edit, admin)
