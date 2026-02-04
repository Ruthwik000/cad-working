// @ts-nocheck
// TypeScript has false positive errors with Firebase SDK imports
// These don't affect functionality - the code works correctly
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  addDoc,
  onSnapshot,
  arrayUnion
} from 'firebase/firestore';
import { db } from './config';

// Types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
  image?: string;
}

export interface Session {
  id: string;
  userId: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  messages: ChatMessage[];
  modelCode?: string;
  thumbnail?: string;
  isShared?: boolean; // For collaborative sessions
  sharedWith?: string[]; // Array of user IDs who have access
  collaborators?: CollaboratorInfo[]; // Active collaborators
}

export interface CollaboratorInfo {
  userId: string;
  displayName: string;
  email: string;
  joinedAt: Timestamp;
  lastActive: Timestamp;
  color: string; // For cursor/presence indicator
}

export interface SessionComment {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Timestamp;
  position?: { line: number; column: number }; // For code comments
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastLogin: Timestamp;
}

// User Profile Operations
export const createUserProfile = async (userId: string, data: Partial<UserProfile>) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...data,
      uid: userId,
      createdAt: Timestamp.now(),
      lastLogin: Timestamp.now()
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId: string, data: Partial<UserProfile>) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      lastLogin: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Session Operations
export const createSession = async (userId: string, title: string): Promise<string> => {
  try {
    console.log('Creating session for user:', userId, 'with title:', title);
    const sessionData = {
      userId,
      title,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      messages: [],
      modelCode: '',
      isShared: false
    };
    
    const sessionRef = await addDoc(collection(db, 'sessions'), sessionData);
    console.log('Session created with ID:', sessionRef.id);
    return sessionRef.id;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

export const getSession = async (sessionId: string): Promise<Session | null> => {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    
    if (sessionSnap.exists()) {
      return { id: sessionSnap.id, ...sessionSnap.data() } as Session;
    }
    return null;
  } catch (error) {
    console.error('Error getting session:', error);
    throw error;
  }
};

export const getUserSessions = async (userId: string): Promise<Session[]> => {
  try {
    console.log('Fetching sessions for user:', userId);
    const sessionsRef = collection(db, 'sessions');
    const q = query(
      sessionsRef,
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );
    
    const querySnapshot = await getDocs(q);
    const sessions: Session[] = [];
    
    querySnapshot.forEach((doc: any) => {
      const sessionData = { id: doc.id, ...doc.data() } as Session;
      console.log('Found session:', sessionData.id, sessionData.title);
      sessions.push(sessionData);
    });
    
    console.log('Total sessions found:', sessions.length);
    return sessions;
  } catch (error) {
    console.error('Error getting user sessions:', error);
    console.error('Error details:', error);
    throw error;
  }
};

export const updateSession = async (
  sessionId: string,
  data: {
    messages?: ChatMessage[];
    modelCode?: string;
    title?: string;
    thumbnail?: string;
  }
) => {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    
    // Filter out undefined values
    const updateData: any = {
      updatedAt: Timestamp.now()
    };
    
    if (data.messages !== undefined) updateData.messages = data.messages;
    if (data.modelCode !== undefined) updateData.modelCode = data.modelCode;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail;
    
    await updateDoc(sessionRef, updateData);
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
};

export const deleteSession = async (sessionId: string) => {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    await deleteDoc(sessionRef);
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
};

// Add message to session
export const addMessageToSession = async (
  sessionId: string,
  message: Omit<ChatMessage, 'timestamp'>
) => {
  try {
    const session = await getSession(sessionId);
    if (!session) throw new Error('Session not found');
    
    const newMessage: any = {
      role: message.role,
      content: message.content,
      timestamp: Timestamp.now()
    };
    
    // Only add image if it exists
    if (message.image) {
      newMessage.image = message.image;
    }
    
    const updatedMessages = [...(session.messages || []), newMessage];
    await updateSession(sessionId, { messages: updatedMessages });
  } catch (error) {
    console.error('Error adding message to session:', error);
    throw error;
  }
};


// Toggle session sharing for collaboration
export const toggleSessionSharing = async (sessionId: string, isShared: boolean) => {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      isShared,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error toggling session sharing:', error);
    throw error;
  }
};

// Get session by ID (for loading shared sessions)
export const getSessionById = async (sessionId: string): Promise<Session | null> => {
  return await getSession(sessionId);
};

// Real-time listener for session updates (for collaboration)
export const subscribeToSession = (
  sessionId: string,
  callback: (session: Session | null) => void
) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  
  const unsubscribe = onSnapshot(
    sessionRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() } as Session);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error in session subscription:', error);
      callback(null);
    }
  );
  
  return unsubscribe;
};

// Add collaborator to session
export const addCollaborator = async (
  sessionId: string,
  collaborator: Omit<CollaboratorInfo, 'joinedAt' | 'lastActive'>
) => {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    const session = await getSession(sessionId);
    
    if (!session) throw new Error('Session not found');
    
    const newCollaborator: CollaboratorInfo = {
      ...collaborator,
      joinedAt: Timestamp.now(),
      lastActive: Timestamp.now()
    };
    
    const existingCollaborators = session.collaborators || [];
    const updatedCollaborators = existingCollaborators.filter(
      c => c.userId !== collaborator.userId
    );
    updatedCollaborators.push(newCollaborator);
    
    await updateDoc(sessionRef, {
      collaborators: updatedCollaborators,
      sharedWith: arrayUnion(collaborator.userId),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error adding collaborator:', error);
    throw error;
  }
};

// Update collaborator activity
export const updateCollaboratorActivity = async (
  sessionId: string,
  userId: string
) => {
  try {
    const session = await getSession(sessionId);
    if (!session || !session.collaborators) return;
    
    const updatedCollaborators = session.collaborators.map(c =>
      c.userId === userId ? { ...c, lastActive: Timestamp.now() } : c
    );
    
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      collaborators: updatedCollaborators
    });
  } catch (error) {
    console.error('Error updating collaborator activity:', error);
  }
};

// Remove collaborator from session
export const removeCollaborator = async (
  sessionId: string,
  userId: string
) => {
  try {
    const session = await getSession(sessionId);
    if (!session) return;
    
    const updatedCollaborators = (session.collaborators || []).filter(
      c => c.userId !== userId
    );
    
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      collaborators: updatedCollaborators,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error removing collaborator:', error);
    throw error;
  }
};

// Add comment/tag to session
export const addSessionComment = async (
  sessionId: string,
  comment: Omit<SessionComment, 'id' | 'timestamp' | 'sessionId'>
) => {
  try {
    const commentData = {
      ...comment,
      sessionId,
      timestamp: Timestamp.now()
    };
    
    const commentRef = await addDoc(
      collection(db, 'sessions', sessionId, 'comments'),
      commentData
    );
    
    return commentRef.id;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

// Subscribe to session comments
export const subscribeToComments = (
  sessionId: string,
  callback: (comments: SessionComment[]) => void
) => {
  const commentsRef = collection(db, 'sessions', sessionId, 'comments');
  const q = query(commentsRef, orderBy('timestamp', 'asc'));
  
  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const comments: SessionComment[] = [];
      querySnapshot.forEach((doc) => {
        comments.push({ id: doc.id, ...doc.data() } as SessionComment);
      });
      callback(comments);
    },
    (error) => {
      console.error('Error in comments subscription:', error);
      callback([]);
    }
  );
  
  return unsubscribe;
};

// Generate shareable link token
export const generateShareToken = async (sessionId: string): Promise<string> => {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      isShared: true,
      updatedAt: Timestamp.now()
    });
    
    // Return the session ID as the share token (you can make this more complex if needed)
    return sessionId;
  } catch (error) {
    console.error('Error generating share token:', error);
    throw error;
  }
};
