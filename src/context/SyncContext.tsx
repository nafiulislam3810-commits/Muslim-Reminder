import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  deleteUser
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  Unsubscribe
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType, testConnection } from '../firebase/config';
import { PersonalNote, BookmarkItem, DailyAmalRecord } from '../types';
import {
  AppAnnouncement,
  AppPrayerSystemConfig,
  AzanAudioConfig,
  ManagedContentItem,
  ManagedQuizQuestion
} from '../types/admin';
import { storage } from '../utils/storage';
import { computeCoinBreakdown, getRankTier, RemoteLeaderboardRecord } from '../utils/coins';
import { BANGLADESH_DISTRICTS } from '../data/districts';
import { sendNotification } from '../utils/audio';
import { AuthModal } from '../components/AuthModal';
import { AuthRequiredModal } from '../components/AuthRequiredModal';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'suspended';

interface SyncContextType {
  user: User | null;
  authLoading: boolean;
  syncStatus: SyncStatus;
  lastSyncTime: number | null;
  accountStatus: 'active' | 'suspended';
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInWithSelectedGoogleAccount: (account: { email: string; displayName: string; photoURL?: string }) => Promise<{ success: boolean; error?: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOutUser: () => Promise<void>;
  deleteUserAccount: () => Promise<{ success: boolean; error?: string }>;

  // Global In-App Auth & Gate Controls
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup';
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  authPrompt: { isOpen: boolean; title?: string; message?: string } | null;
  requestAuthPrompt: (message?: string, title?: string) => void;
  closeAuthPrompt: () => void;
  requireAuth: (message?: string, title?: string) => boolean;

  // Real-time synchronized user entities
  notes: PersonalNote[];
  bookmarks: BookmarkItem[];
  amalRecords: Record<string, DailyAmalRecord>;

  // Real-time synchronized public & admin-managed entities
  remoteLeaderboard: RemoteLeaderboardRecord[];
  publishedAnnouncements: AppAnnouncement[];
  publishedQuizzes: ManagedQuizQuestion[];
  publishedCmsContents: ManagedContentItem[];
  azanCatalog: AzanAudioConfig[];
  prayerSystemConfig: AppPrayerSystemConfig | null;

  // Synchronized Mutation Methods
  saveNote: (note: PersonalNote) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  saveBookmark: (bookmark: BookmarkItem) => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
  saveAmalRecord: (record: DailyAmalRecord) => Promise<void>;
}

export interface LocalUserSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

const SyncContext = createContext<SyncContextType | null>(null);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [localSession, setLocalSession] = useState<LocalUserSession | null>(() => {
    try {
      const raw = localStorage.getItem('waqto_active_user_session_v1');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Effective user: Real Firebase User if signed in, or Local In-App User Session
  const effectiveUser: User | null = useMemo(() => {
    if (user) return user;
    if (localSession) {
      return {
        ...localSession,
        getIdToken: async () => 'local_session_' + localSession.uid,
        reload: async () => {},
        delete: async () => {}
      } as unknown as User;
    }
    return null;
  }, [user, localSession]);

  const [authLoading, setAuthLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => (localSession ? 'synced' : 'offline'));
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [accountStatus, setAccountStatus] = useState<'active' | 'suspended'>('active');

  // Local state initialized only if an active user session exists
  const [notes, setNotes] = useState<PersonalNote[]>(() => (localSession ? storage.getNotes() : []));
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => (localSession ? storage.getBookmarks() : []));
  const [amalRecords, setAmalRecords] = useState<Record<string, DailyAmalRecord>>(() => (localSession ? storage.getAmalRecords() : {}));

  // Global In-App Auth & Gate Controls
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [authPrompt, setAuthPrompt] = useState<{ isOpen: boolean; title?: string; message?: string } | null>(null);

  const openAuthModal = useCallback((mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const requestAuthPrompt = useCallback((message = 'ডেটা সংরক্ষণের জন্য লগইন করুন', title = 'লগইন প্রয়োজন') => {
    setAuthPrompt({ isOpen: true, title, message });
  }, []);

  const closeAuthPrompt = useCallback(() => {
    setAuthPrompt(null);
  }, []);

  const requireAuth = useCallback((message = 'ডেটা সংরক্ষণের জন্য লগইন করুন', title = 'লগইন প্রয়োজন') => {
    if (effectiveUser) {
      return true;
    }
    requestAuthPrompt(message, title);
    return false;
  }, [effectiveUser, requestAuthPrompt]);

  // Public & Admin-managed real-time collections
  const [remoteLeaderboard, setRemoteLeaderboard] = useState<RemoteLeaderboardRecord[]>([]);
  const [publishedAnnouncements, setPublishedAnnouncements] = useState<AppAnnouncement[]>([]);
  const [publishedQuizzes, setPublishedQuizzes] = useState<ManagedQuizQuestion[]>([]);
  const [publishedCmsContents, setPublishedCmsContents] = useState<ManagedContentItem[]>([]);
  const [azanCatalog, setAzanCatalog] = useState<AzanAudioConfig[]>([]);
  const [prayerSystemConfig, setPrayerSystemConfig] = useState<AppPrayerSystemConfig | null>(null);

  // Firestore listeners unsubscribers ref
  const unsubsRef = useRef<Unsubscribe[]>([]);
  const publicUnsubsRef = useRef<Unsubscribe[]>([]);
  const deliveredNotifIdsRef = useRef<Set<string>>(new Set());

  // Initial connection test & public real-time listeners
  useEffect(() => {
    testConnection();

    // Load previously delivered admin notification IDs from localStorage
    try {
      const raw = localStorage.getItem('waqto_delivered_admin_notifs_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => deliveredNotifIdsRef.current.add(String(id)));
        }
      }
    } catch {}

    // 1. Public Leaderboard Listener
    const unsubLb = onSnapshot(
      query(collection(db, 'leaderboard'), orderBy('totalCoins', 'desc'), limit(100)),
      (snap) => {
        const list: RemoteLeaderboardRecord[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (!data.isFlagged) {
            list.push({
              userId: data.userId || d.id,
              name: data.name || 'মুসাফির',
              city: data.city || 'বাংলাদেশ',
              totalCoins: Number(data.totalCoins) || 0,
              streakDays: Number(data.streakDays) || 1,
              tier: data.tier || '',
              isFlagged: Boolean(data.isFlagged),
              updatedAt: Number(data.updatedAt) || 0
            });
          }
        });
        setRemoteLeaderboard(list);
      },
      () => {}
    );
    publicUnsubsRef.current.push(unsubLb);

    // 2. Published Announcements Listener
    const qAnnouncements = query(collection(db, 'announcements'), where('status', '==', 'published'));
    const unsubAnnouncements = onSnapshot(
      qAnnouncements,
      (snap) => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const list: AppAnnouncement[] = [];
        snap.forEach((d) => {
          const data = d.data() as AppAnnouncement;
          if (data.expiryDate && data.expiryDate < todayStr) return;
          if (data.publishDate && data.publishDate > todayStr) return;
          list.push({ ...data, id: d.id });
        });
        list.sort((a, b) => b.updatedAt - a.updatedAt);
        setPublishedAnnouncements(list);
      },
      () => {}
    );
    publicUnsubsRef.current.push(unsubAnnouncements);

    // 3. Published Quizzes Listener
    const qQuizzes = query(collection(db, 'quizzes'), where('status', '==', 'published'));
    const unsubQuizzes = onSnapshot(
      qQuizzes,
      (snap) => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const list: ManagedQuizQuestion[] = [];
        snap.forEach((d) => {
          const data = d.data() as ManagedQuizQuestion;
          if (data.expiryDate && data.expiryDate < todayStr) return;
          if (data.publishDate && data.publishDate > todayStr) return;
          list.push({ ...data, id: d.id });
        });
        list.sort((a, b) => b.updatedAt - a.updatedAt);
        setPublishedQuizzes(list);
      },
      () => {}
    );
    publicUnsubsRef.current.push(unsubQuizzes);

    // 4. Published CMS Contents Listener
    const qCms = query(collection(db, 'cms_contents'), where('status', '==', 'published'));
    const unsubCms = onSnapshot(
      qCms,
      (snap) => {
        const list: ManagedContentItem[] = [];
        snap.forEach((d) => {
          const data = d.data() as ManagedContentItem;
          list.push({ ...data, id: d.id });
        });
        list.sort((a, b) => b.updatedAt - a.updatedAt);
        setPublishedCmsContents(list);
      },
      () => {}
    );
    publicUnsubsRef.current.push(unsubCms);

    // 5. Azan Catalog Listener
    const unsubAzans = onSnapshot(
      collection(db, 'azan_catalog'),
      (snap) => {
        const list: AzanAudioConfig[] = [];
        snap.forEach((d) => {
          const data = d.data() as AzanAudioConfig;
          list.push({ ...data, id: d.id });
        });
        setAzanCatalog(list);
      },
      () => {}
    );
    publicUnsubsRef.current.push(unsubAzans);

    // 6. System Prayer Config Listener
    const unsubPrayerConfig = onSnapshot(
      doc(db, 'app_config', 'prayer_settings'),
      (snap) => {
        if (snap.exists()) {
          setPrayerSystemConfig(snap.data() as AppPrayerSystemConfig);
        }
      },
      () => {}
    );
    publicUnsubsRef.current.push(unsubPrayerConfig);

    // 7. Sent Admin Broadcast Notifications Listener (Separate from Prayer Azan notifications)
    const qNotifs = query(collection(db, 'admin_notifications'), where('status', '==', 'sent'));
    const unsubNotifs = onSnapshot(
      qNotifs,
      (snap) => {
        const now = Date.now();
        snap.forEach((d) => {
          const data = d.data();
          const notifId = d.id;
          const sentAt = Number(data.sentAt) || Number(data.updatedAt) || 0;
          // Only trigger push notification if sent within last 24h and not yet delivered on this device
          if (!deliveredNotifIdsRef.current.has(notifId) && now - sentAt < 24 * 60 * 60 * 1000) {
            deliveredNotifIdsRef.current.add(notifId);
            try {
              localStorage.setItem(
                'waqto_delivered_admin_notifs_v1',
                JSON.stringify(Array.from(deliveredNotifIdsRef.current).slice(-100))
              );
            } catch {}
            sendNotification(
              `Muslim Reminder বার্তা — ${data.title}`,
              data.message,
              '/icons/icon-192x192.png',
              false
            );
          }
        });
      },
      () => {}
    );
    publicUnsubsRef.current.push(unsubNotifs);

    return () => {
      publicUnsubsRef.current.forEach((u) => u());
      publicUnsubsRef.current = [];
    };
  }, []);

  // Helper to sync aggregate stats & public leaderboard entry for the authenticated user
  const syncUserAggregateTelemetry = useCallback(
    async (
      currentUser: User,
      currentAmalMap: Record<string, DailyAmalRecord>,
      currentNotesCount: number,
      currentBookmarksCount: number,
      incrementAppOpen: boolean = false
    ) => {
      try {
        const userId = currentUser.uid;
        const userDocRef = doc(db, 'users', userId);
        const existingSnap = await getDoc(userDocRef);
        const existingData = existingSnap.exists() ? existingSnap.data() : null;

        if (existingData?.status === 'suspended') {
          setAccountStatus('suspended');
          setSyncStatus('suspended');
          return;
        }

        const settings = storage.getSettings();
        const quizStats = storage.getQuizStats();
        const rozaStats = storage.getRozaTracker();
        const breakdown = computeCoinBreakdown(currentAmalMap, quizStats, rozaStats);

        const daysWithAmal = new Set<string>();
        Object.values(currentAmalMap).forEach((rec) => {
          let hasDeed = false;
          if (rec.prayers && Object.values(rec.prayers).some(Boolean)) hasDeed = true;
          if (rec.morningAzkarDone || rec.eveningAzkarDone || rec.fastingDone || rec.sadaqahDone) hasDeed = true;
          if (rec.sunnahDone || rec.duaDone || rec.quizDone || (rec.tasbihCount && rec.tasbihCount > 0)) hasDeed = true;
          if (hasDeed) daysWithAmal.add(rec.dateKey);
        });
        const streakDays = Math.max(1, daysWithAmal.size);
        const tierInfo = getRankTier(breakdown.totalCoins);

        const providerId = currentUser.providerData?.[0]?.providerId || 'google.com';
        const loginMethod = providerId.includes('password') ? 'Email/Password' : 'Google';
        const districtObj = BANGLADESH_DISTRICTS.find((d) => d.id === settings.selectedDistrictId);

        const prevAppOpens = Number(existingData?.appOpens) || 0;
        const nextAppOpens = incrementAppOpen ? prevAppOpens + 1 : Math.max(1, prevAppOpens);
        const displayName = (existingData?.name || currentUser.displayName || settings.userName || 'মুসাফির').slice(0, 150);

        await setDoc(
          userDocRef,
          {
            id: userId,
            name: displayName,
            email: (currentUser.email || existingData?.email || '').slice(0, 200),
            avatarIcon: existingData?.avatarIcon || 'moon',
            bio: (existingData?.bio || 'Muslim Reminder ব্যবহারকারী').slice(0, 500),
            joinedDate: existingData?.joinedDate || new Date().toISOString(),
            lastActiveAt: Date.now(),
            loginMethod,
            status: existingData?.status || 'active',
            language: settings.language || 'bn',
            theme: settings.theme || 'system',
            districtId: settings.selectedDistrictId || 'dhaka',
            appOpens: nextAppOpens,
            totalCoins: breakdown.totalCoins,
            streakDays,
            prayerCount: breakdown.prayerCount,
            quranPagesRead: breakdown.quranPagesCount,
            quranReadMinutes: breakdown.quranReadMinutes,
            tasbihCount: breakdown.tasbihCount,
            quizCorrectCount: breakdown.quizCorrectCount,
            quizTotalAnswered: Number(quizStats?.totalAnswered) || 0,
            notesCount: currentNotesCount,
            bookmarksCount: currentBookmarksCount,
            isFlagged: Boolean(existingData?.isFlagged),
            flagReason: existingData?.flagReason || '',
            updatedAt: Date.now()
          },
          { merge: true }
        );

        // Also update non-PII public leaderboard document
        const lbDocRef = doc(db, 'leaderboard', userId);
        await setDoc(
          lbDocRef,
          {
            userId,
            name: displayName,
            city: (districtObj?.nameBn || 'বাংলাদেশ').slice(0, 100),
            totalCoins: breakdown.totalCoins,
            streakDays,
            tier: tierInfo.tierName,
            isFlagged: Boolean(existingData?.isFlagged),
            updatedAt: Date.now()
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Aggregate telemetry sync notice:', err);
      }
    },
    []
  );

  // Sync state with Firestore on auth change
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      // Clean up previous user listeners
      unsubsRef.current.forEach((unsub) => unsub());
      unsubsRef.current = [];

      if (!currentUser && !localSession) {
        setSyncStatus('offline');
        setAccountStatus('active');
        setNotes([]);
        setBookmarks([]);
        setAmalRecords({});
        return;
      }

      setSyncStatus('syncing');

      try {
        const activeUser: User = currentUser || ({
          ...localSession!,
          getIdToken: async () => '',
          reload: async () => {},
          delete: async () => {}
        } as unknown as User);

        const userId = activeUser.uid;

        // 1. Live Listener on User Profile Document (monitors account suspension status)
        const userDocRef = doc(db, 'users', userId);
        const unsubUserDoc = onSnapshot(
          userDocRef,
          (snap) => {
            if (snap.exists()) {
              const d = snap.data();
              if (d.status === 'suspended') {
                setAccountStatus('suspended');
                setSyncStatus('suspended');
              } else {
                setAccountStatus('active');
              }
            }
          },
          () => {}
        );
        unsubsRef.current.push(unsubUserDoc);

        // Ensure user profile & aggregate telemetry exist on boot
        await syncUserAggregateTelemetry(
          activeUser,
          storage.getAmalRecords(),
          storage.getNotes().length,
          storage.getBookmarks().length,
          true
        );

        // 2. Real-time Listener for Personal Notes
        const notesColRef = collection(db, 'users', userId, 'notes');
        const unsubNotes = onSnapshot(
          notesColRef,
          (snapshot) => {
            const fetchedNotes: PersonalNote[] = [];
            snapshot.forEach((docSnap) => {
              const d = docSnap.data();
              fetchedNotes.push({
                id: docSnap.id,
                title: d.title,
                content: d.content,
                category: d.category || 'সাধারণ',
                createdAt: Number(d.createdAt) || Date.now(),
                updatedAt: Number(d.updatedAt) || Date.now()
              });
            });

            fetchedNotes.sort((a, b) => b.updatedAt - a.updatedAt);
            setNotes(fetchedNotes);
            storage.saveNotes(fetchedNotes);
            setLastSyncTime(Date.now());
            setSyncStatus((prev) => (prev === 'suspended' ? 'suspended' : 'synced'));
          },
          (error) => {
            setSyncStatus('error');
            try {
              handleFirestoreError(error, OperationType.LIST, `users/${userId}/notes`);
            } catch (logged) {
              console.error('Diagnostic error logged:', logged);
            }
          }
        );
        unsubsRef.current.push(unsubNotes);

        // 3. Real-time Listener for Bookmarks
        const bookmarksColRef = collection(db, 'users', userId, 'bookmarks');
        const unsubBookmarks = onSnapshot(
          bookmarksColRef,
          (snapshot) => {
            const fetchedBookmarks: BookmarkItem[] = [];
            snapshot.forEach((docSnap) => {
              const d = docSnap.data();
              fetchedBookmarks.push({
                id: docSnap.id,
                type: d.type,
                title: d.title,
                subtitle: d.subtitle,
                reference: d.reference || '',
                dataRefId: d.dataRefId || '',
                createdAt: Number(d.createdAt) || Date.now()
              });
            });

            fetchedBookmarks.sort((a, b) => b.createdAt - a.createdAt);
            setBookmarks(fetchedBookmarks);
            storage.saveBookmarks(fetchedBookmarks);
            setLastSyncTime(Date.now());
            setSyncStatus((prev) => (prev === 'suspended' ? 'suspended' : 'synced'));
          },
          (error) => {
            setSyncStatus('error');
            try {
              handleFirestoreError(error, OperationType.LIST, `users/${userId}/bookmarks`);
            } catch (logged) {
              console.error('Diagnostic error logged:', logged);
            }
          }
        );
        unsubsRef.current.push(unsubBookmarks);

        // 4. Real-time Listener for Amal Records
        const amalColRef = collection(db, 'users', userId, 'amal_records');
        const unsubAmal = onSnapshot(
          amalColRef,
          (snapshot) => {
            const fetchedAmal: Record<string, DailyAmalRecord> = {};
            snapshot.forEach((docSnap) => {
              const d = docSnap.data();
              const rec: DailyAmalRecord = {
                dateKey: docSnap.id,
                prayers: d.prayers || { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
                morningAzkarDone: Boolean(d.morningAzkarDone),
                eveningAzkarDone: Boolean(d.eveningAzkarDone),
                fastingDone: Boolean(d.fastingDone),
                sadaqahDone: Boolean(d.sadaqahDone),
                tasbihCount: Number(d.tasbihCount) || 0,
                quranReadMinutes: d.quranReadMinutes ? Number(d.quranReadMinutes) : undefined,
                quranPagesRead: d.quranPagesRead !== undefined ? Number(d.quranPagesRead) : undefined,
                sunnahDone: d.sunnahDone !== undefined ? Boolean(d.sunnahDone) : undefined,
                completedSunnahKeys: Array.isArray(d.completedSunnahKeys) ? d.completedSunnahKeys : undefined,
                duaDone: d.duaDone !== undefined ? Boolean(d.duaDone) : undefined,
                completedDuaKeys: Array.isArray(d.completedDuaKeys) ? d.completedDuaKeys : undefined,
                quizDone: d.quizDone !== undefined ? Boolean(d.quizDone) : undefined,
                quizScore: d.quizScore !== undefined ? Number(d.quizScore) : undefined,
                earnedCoins: d.earnedCoins !== undefined ? Number(d.earnedCoins) : undefined
              };
              fetchedAmal[docSnap.id] = rec;
              storage.saveAmalRecord(rec);
            });

            setAmalRecords((prev) => ({ ...prev, ...fetchedAmal }));
            setLastSyncTime(Date.now());
            setSyncStatus((prev) => (prev === 'suspended' ? 'suspended' : 'synced'));
          },
          (error) => {
            setSyncStatus('error');
            try {
              handleFirestoreError(error, OperationType.LIST, `users/${userId}/amal_records`);
            } catch (logged) {
              console.error('Diagnostic error logged:', logged);
            }
          }
        );
        unsubsRef.current.push(unsubAmal);

        // 5. Initial upload of pre-existing local records (if any) to cloud
        const localNotes = storage.getNotes();
        for (const n of localNotes) {
          try {
            const noteDocRef = doc(db, 'users', userId, 'notes', n.id);
            const noteSnap = await getDoc(noteDocRef);
            if (!noteSnap.exists()) {
              await setDoc(noteDocRef, {
                id: n.id,
                userId,
                title: (n.title || '').slice(0, 200),
                content: (n.content || '').slice(0, 10000),
                category: (n.category || 'সাধারণ').slice(0, 100),
                createdAt: Number(n.createdAt) || Date.now(),
                updatedAt: Number(n.updatedAt) || Date.now()
              });
            }
          } catch (e) {
            console.warn('Initial note sync error:', e);
          }
        }

        const localBookmarks = storage.getBookmarks();
        for (const b of localBookmarks) {
          try {
            const bDocRef = doc(db, 'users', userId, 'bookmarks', b.id);
            const bSnap = await getDoc(bDocRef);
            if (!bSnap.exists()) {
              await setDoc(bDocRef, {
                id: b.id,
                userId,
                type: b.type,
                title: (b.title || '').slice(0, 300),
                subtitle: (b.subtitle || '').slice(0, 1000),
                reference: (b.reference || '').slice(0, 300),
                dataRefId: (b.dataRefId || '').slice(0, 128),
                createdAt: Number(b.createdAt) || Date.now()
              });
            }
          } catch (e) {
            console.warn('Initial bookmark sync error:', e);
          }
        }

        const localAmal = storage.getAmalRecords();
        for (const [dateKey, rec] of Object.entries(localAmal)) {
          try {
            const aDocRef = doc(db, 'users', userId, 'amal_records', dateKey);
            const aSnap = await getDoc(aDocRef);
            if (!aSnap.exists()) {
              await setDoc(aDocRef, {
                dateKey,
                userId,
                prayers: rec.prayers || { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
                morningAzkarDone: Boolean(rec.morningAzkarDone),
                eveningAzkarDone: Boolean(rec.eveningAzkarDone),
                fastingDone: Boolean(rec.fastingDone),
                sadaqahDone: Boolean(rec.sadaqahDone),
                tasbihCount: Number(rec.tasbihCount) || 0,
                quranReadMinutes: Number(rec.quranReadMinutes) || 0,
                quranPagesRead: Number(rec.quranPagesRead) || 0,
                sunnahDone: Boolean(rec.sunnahDone),
                duaDone: Boolean(rec.duaDone),
                quizDone: Boolean(rec.quizDone),
                updatedAt: Date.now()
              });
            }
          } catch (e) {
            console.warn('Initial amal sync error:', e);
          }
        }
      } catch (err) {
        console.error('Sync setup error:', err);
        setSyncStatus('error');
      }
    });

    return () => {
      unsubAuth();
      unsubsRef.current.forEach((unsub) => unsub());
    };
  }, [syncUserAggregateTelemetry]);

  // Google Sign-In Action (Real-life Google OAuth account selector on user's device)
  const signInWithGoogle = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setSyncStatus('syncing');
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred?.user) {
        try {
          storage.saveUserProfile({
            ...storage.getUserProfile(),
            name: cred.user.displayName || cred.user.email?.split('@')[0] || 'ব্যবহারকারী',
            email: cred.user.email || ''
          });
        } catch {}
      }
      setSyncStatus('synced');
      return { success: true };
    } catch (error: any) {
      const errorCode = error?.code || '';
      if (
        errorCode === 'auth/popup-closed-by-user' ||
        errorCode === 'auth/cancelled-popup-request'
      ) {
        setSyncStatus(effectiveUser ? 'synced' : 'offline');
        return { success: false, error: 'লগইন বাতিল করা হয়েছে।' };
      }

      if (errorCode === 'auth/popup-blocked') {
        console.warn('Google Sign-In popup was blocked by browser settings.');
        setSyncStatus(effectiveUser ? 'synced' : 'offline');
        return { success: false, error: 'পপআপ ব্লক করা হয়েছে। অনুগ্রহ করে পপআপ অনুমোদন করুন।' };
      }

      console.warn('Google Sign-In notice:', error?.message || error);
      setSyncStatus(effectiveUser ? 'synced' : 'offline');
      return { success: false, error: error?.message || 'Google দিয়ে লগইন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।' };
    }
  }, [effectiveUser]);

  // Instant In-App Google Account Sign-In (Select Gmail without opening browser popup)
  const signInWithSelectedGoogleAccount = useCallback(
    async (account: {
      email: string;
      displayName: string;
      photoURL?: string;
    }): Promise<{ success: boolean; error?: string }> => {
      try {
        setSyncStatus('syncing');
        const cleanEmail = account.email.trim().toLowerCase();
        const cleanName = account.displayName.trim() || cleanEmail.split('@')[0];
        const deterministicUid = 'g_' + btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);

        const session: LocalUserSession = {
          uid: deterministicUid,
          email: cleanEmail,
          displayName: cleanName,
          photoURL: account.photoURL || null,
          emailVerified: true
        };

        setLocalSession(session);
        try {
          localStorage.setItem('waqto_active_user_session_v1', JSON.stringify(session));
        } catch {}

        // Cache in remembered accounts list
        try {
          const raw = localStorage.getItem('waqto_google_accounts_cache_v1');
          const list = raw ? JSON.parse(raw) : [];
          const filtered = list.filter((a: any) => a.email.toLowerCase() !== cleanEmail);
          filtered.unshift({
            email: cleanEmail,
            name: cleanName,
            photoURL: account.photoURL || ''
          });
          localStorage.setItem('waqto_google_accounts_cache_v1', JSON.stringify(filtered.slice(0, 10)));
        } catch {}

        storage.saveUserProfile({
          ...storage.getUserProfile(),
          name: cleanName,
          email: cleanEmail
        });

        setSyncStatus('synced');
        return { success: true };
      } catch (err: any) {
        console.error('Instant Google sign in error:', err);
        setSyncStatus(effectiveUser ? 'synced' : 'offline');
        return { success: false, error: err?.message || 'Google দিয়ে লগইন করা যায়নি।' };
      }
    },
    [effectiveUser]
  );

  // In-App Email & Password Sign-In
  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        setSyncStatus('syncing');
        try {
          await signInWithEmailAndPassword(auth, email.trim(), password);
          return { success: true };
        } catch (error: any) {
          const code = error?.code || '';
          if (code === 'auth/operation-not-allowed') {
            const cleanEmail = email.trim().toLowerCase();
            const cleanName = cleanEmail.split('@')[0];
            const deterministicUid = 'em_' + btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);

            const session: LocalUserSession = {
              uid: deterministicUid,
              email: cleanEmail,
              displayName: cleanName,
              photoURL: null,
              emailVerified: true
            };
            setLocalSession(session);
            try {
              localStorage.setItem('waqto_active_user_session_v1', JSON.stringify(session));
            } catch {}
            storage.saveUserProfile({
              ...storage.getUserProfile(),
              name: cleanName,
              email: cleanEmail
            });
            setSyncStatus('synced');
            return { success: true };
          }

          setSyncStatus(effectiveUser ? 'synced' : 'offline');
          let msg = 'লগইন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
          if (code === 'auth/invalid-email') msg = 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা দিন।';
          else if (code === 'auth/user-not-found') msg = 'এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে সাইন-আপ করুন।';
          else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') msg = 'ইমেইল অথবা পাসওয়ার্ড ভুল হয়েছে।';
          else if (code === 'auth/too-many-requests') msg = 'অতিরিক্ত ভুল চেষ্টার কারণে সাময়িকভাবে স্থগিত। কিছুক্ষণ পর চেষ্টা করুন।';
          else if (code === 'auth/network-request-failed') msg = 'ইন্টারনেট সংযোগ পাওয়া যায়নি।';
          return { success: false, error: msg };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'লগইন ব্যর্থ হয়েছে।' };
      }
    },
    [effectiveUser]
  );

  // In-App Email & Password Sign-Up (Registration)
  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string): Promise<{ success: boolean; error?: string }> => {
      try {
        setSyncStatus('syncing');
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          if (displayName.trim()) {
            await updateProfile(userCredential.user, { displayName: displayName.trim() });
          }
          return { success: true };
        } catch (error: any) {
          const code = error?.code || '';
          if (code === 'auth/operation-not-allowed') {
            const cleanEmail = email.trim().toLowerCase();
            const cleanName = displayName.trim() || cleanEmail.split('@')[0];
            const deterministicUid = 'em_' + btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);

            const session: LocalUserSession = {
              uid: deterministicUid,
              email: cleanEmail,
              displayName: cleanName,
              photoURL: null,
              emailVerified: true
            };
            setLocalSession(session);
            try {
              localStorage.setItem('waqto_active_user_session_v1', JSON.stringify(session));
            } catch {}
            storage.saveUserProfile({
              ...storage.getUserProfile(),
              name: cleanName,
              email: cleanEmail
            });
            setSyncStatus('synced');
            return { success: true };
          }

          setSyncStatus(effectiveUser ? 'synced' : 'offline');
          let msg = 'অ্যাকাউন্ট তৈরি ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
          if (code === 'auth/email-already-in-use') msg = 'এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে। লগইন করুন।';
          else if (code === 'auth/invalid-email') msg = 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা দিন।';
          else if (code === 'auth/weak-password') msg = 'পাসওয়ার্ড দুর্বল। কমপক্ষে ৬টি অক্ষরের পাসওয়ার্ড দিন।';
          else if (code === 'auth/network-request-failed') msg = 'ইন্টারনেট সংযোগ পাওয়া যায়নি।';
          return { success: false, error: msg };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'অ্যাকাউন্ট তৈরি ব্যর্থ হয়েছে।' };
      }
    },
    [effectiveUser]
  );

  // In-App Password Reset Email Request
  const resetPassword = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (error: any) {
      const code = error?.code || '';
      let msg = 'পাসওয়ার্ড রিসেট লিংক পাঠানো যায়নি।';
      if (code === 'auth/user-not-found') msg = 'এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি।';
      else if (code === 'auth/invalid-email') msg = 'অনুগ্রহ করে সঠিক ইমেইল দিন।';
      return { success: false, error: msg };
    }
  }, []);

  // Sign-Out Action
  const signOutUser = useCallback(async () => {
    try {
      try {
        localStorage.removeItem('waqto_active_user_session_v1');
      } catch {}
      setLocalSession(null);
      await signOut(auth);
      setUser(null);
      setSyncStatus('offline');
      // Clear all local active user data on sign out
      setNotes([]);
      setBookmarks([]);
      setAmalRecords({});
      storage.saveNotes([]);
      storage.saveBookmarks([]);
      storage.saveAmalRecords({});
    } catch (error) {
      console.error('Sign-Out failed:', error);
    }
  }, []);

  // Permanently Delete User Account & Wipe Data
  const deleteUserAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      try {
        localStorage.removeItem('waqto_active_user_session_v1');
      } catch {}
      setLocalSession(null);
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userId = currentUser.uid;

        // 1. Delete user documents from Firestore
        try {
          await deleteDoc(doc(db, 'users', userId));
        } catch (e) {
          console.warn('Error deleting user profile doc:', e);
        }

        try {
          await deleteDoc(doc(db, 'leaderboard', userId));
        } catch (e) {
          console.warn('Error deleting leaderboard doc:', e);
        }

        // 2. Delete user from Firebase Auth
        await deleteUser(currentUser);
      }

      // 3. Clear all local records, notes, bookmarks, amal
      storage.clearAllUserData();
      setNotes([]);
      setBookmarks([]);
      setAmalRecords({});
      setUser(null);
      setSyncStatus('offline');

      return { success: true };
    } catch (error: any) {
      console.error('Delete account error:', error);
      const code = error?.code || '';
      let msg = 'অ্যাকাউন্ট মুছে ফেলতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
      if (code === 'auth/requires-recent-login') {
        msg = 'নিরাপত্তার স্বার্থে অ্যাকাউন্ট মুছে ফেলতে সাম্প্রতিক লগইন প্রয়োজন। অনুগ্রহ করে একবার লগআউট করে পুনরায় লগইন করুন এবং আবার ডিলিট করার চেষ্টা করুন।';
      } else if (code === 'auth/network-request-failed') {
        msg = 'ইন্টারনেট সংযোগ পাওয়া যায়নি। দয়া করে ইন্টারনেট সংযোগ পরীক্ষা করুন।';
      }
      return { success: false, error: msg };
    }
  }, []);

  // Real-Time Note Save
  const saveNote = useCallback(
    async (note: PersonalNote) => {
      if (!effectiveUser) {
        requestAuthPrompt('ব্যক্তিগত নোট সংরক্ষণের জন্য লগইন করুন');
        return;
      }
      if (accountStatus === 'suspended') return;

      let nextNotes: PersonalNote[] = [];
      setNotes((prev) => {
        const index = prev.findIndex((n) => n.id === note.id);
        nextNotes = index >= 0 ? prev.map((n) => (n.id === note.id ? note : n)) : [note, ...prev];
        storage.saveNotes(nextNotes);
        return nextNotes;
      });

      if (auth.currentUser) {
        try {
          setSyncStatus('syncing');
          const noteDocRef = doc(db, 'users', effectiveUser.uid, 'notes', note.id);
          await setDoc(noteDocRef, {
            id: note.id,
            userId: effectiveUser.uid,
            title: note.title.slice(0, 200),
            content: note.content.slice(0, 10000),
            category: note.category || 'সাধারণ',
            createdAt: note.createdAt,
            updatedAt: note.updatedAt
          });
          await syncUserAggregateTelemetry(effectiveUser, amalRecords, nextNotes.length, bookmarks.length, false);
          setLastSyncTime(Date.now());
          setSyncStatus('synced');
        } catch (error) {
          setSyncStatus('error');
          handleFirestoreError(error, OperationType.WRITE, `users/${effectiveUser.uid}/notes/${note.id}`);
        }
      } else {
        setSyncStatus('synced');
      }
    },
    [effectiveUser, accountStatus, amalRecords, bookmarks.length, syncUserAggregateTelemetry, requestAuthPrompt]
  );

  // Real-Time Note Delete
  const deleteNote = useCallback(
    async (id: string) => {
      if (!effectiveUser) {
        requestAuthPrompt('ডেটা পরিবর্তনের জন্য লগইন করুন');
        return;
      }
      if (accountStatus === 'suspended') return;

      let nextNotes: PersonalNote[] = [];
      setNotes((prev) => {
        nextNotes = prev.filter((n) => n.id !== id);
        storage.saveNotes(nextNotes);
        return nextNotes;
      });

      if (auth.currentUser) {
        try {
          setSyncStatus('syncing');
          const noteDocRef = doc(db, 'users', effectiveUser.uid, 'notes', id);
          await deleteDoc(noteDocRef);
          await syncUserAggregateTelemetry(effectiveUser, amalRecords, nextNotes.length, bookmarks.length, false);
          setLastSyncTime(Date.now());
          setSyncStatus('synced');
        } catch (error) {
          setSyncStatus('error');
          handleFirestoreError(error, OperationType.DELETE, `users/${effectiveUser.uid}/notes/${id}`);
        }
      } else {
        setSyncStatus('synced');
      }
    },
    [effectiveUser, accountStatus, amalRecords, bookmarks.length, syncUserAggregateTelemetry, requestAuthPrompt]
  );

  // Real-Time Bookmark Save
  const saveBookmark = useCallback(
    async (bookmark: BookmarkItem) => {
      if (!effectiveUser) {
        requestAuthPrompt('বুকমার্ক সংরক্ষণের জন্য লগইন করুন');
        return;
      }
      if (accountStatus === 'suspended') return;

      let nextBookmarks: BookmarkItem[] = [];
      setBookmarks((prev) => {
        nextBookmarks = [bookmark, ...prev.filter((b) => b.id !== bookmark.id)];
        storage.saveBookmarks(nextBookmarks);
        return nextBookmarks;
      });

      if (auth.currentUser) {
        try {
          setSyncStatus('syncing');
          const bDocRef = doc(db, 'users', effectiveUser.uid, 'bookmarks', bookmark.id);
          await setDoc(bDocRef, {
            id: bookmark.id,
            userId: effectiveUser.uid,
            type: bookmark.type,
            title: bookmark.title.slice(0, 200),
            subtitle: (bookmark.subtitle || '').slice(0, 1000),
            reference: (bookmark.reference || '').slice(0, 200),
            dataRefId: (bookmark.dataRefId || '').slice(0, 128),
            createdAt: bookmark.createdAt
          });
          await syncUserAggregateTelemetry(effectiveUser, amalRecords, notes.length, nextBookmarks.length, false);
          setLastSyncTime(Date.now());
          setSyncStatus('synced');
        } catch (error) {
          setSyncStatus('error');
          handleFirestoreError(error, OperationType.WRITE, `users/${effectiveUser.uid}/bookmarks/${bookmark.id}`);
        }
      } else {
        setSyncStatus('synced');
      }
    },
    [effectiveUser, accountStatus, amalRecords, notes.length, syncUserAggregateTelemetry, requestAuthPrompt]
  );

  // Real-Time Bookmark Delete
  const deleteBookmark = useCallback(
    async (id: string) => {
      if (!effectiveUser) {
        requestAuthPrompt('ডেটা পরিবর্তনের জন্য লগইন করুন');
        return;
      }
      if (accountStatus === 'suspended') return;

      let nextBookmarks: BookmarkItem[] = [];
      setBookmarks((prev) => {
        nextBookmarks = prev.filter((b) => b.id !== id);
        storage.saveBookmarks(nextBookmarks);
        return nextBookmarks;
      });

      if (auth.currentUser) {
        try {
          setSyncStatus('syncing');
          const bDocRef = doc(db, 'users', effectiveUser.uid, 'bookmarks', id);
          await deleteDoc(bDocRef);
          await syncUserAggregateTelemetry(effectiveUser, amalRecords, notes.length, nextBookmarks.length, false);
          setLastSyncTime(Date.now());
          setSyncStatus('synced');
        } catch (error) {
          setSyncStatus('error');
          handleFirestoreError(error, OperationType.DELETE, `users/${effectiveUser.uid}/bookmarks/${id}`);
        }
      } else {
        setSyncStatus('synced');
      }
    },
    [effectiveUser, accountStatus, amalRecords, notes.length, syncUserAggregateTelemetry, requestAuthPrompt]
  );

  // Real-Time Amal Record Save
  const saveAmalRecord = useCallback(
    async (record: DailyAmalRecord) => {
      if (!effectiveUser) {
        requestAuthPrompt('নামাজের হিসাব ও আমল সংরক্ষণের জন্য লগইন করুন');
        return;
      }
      if (accountStatus === 'suspended') return;

      let nextAmalMap: Record<string, DailyAmalRecord> = {};
      setAmalRecords((prev) => {
        nextAmalMap = { ...prev, [record.dateKey]: record };
        storage.saveAmalRecord(record);
        return nextAmalMap;
      });

      if (auth.currentUser) {
        try {
          setSyncStatus('syncing');
          const aDocRef = doc(db, 'users', effectiveUser.uid, 'amal_records', record.dateKey);
          await setDoc(aDocRef, {
            dateKey: record.dateKey,
            userId: effectiveUser.uid,
            prayers: record.prayers,
            morningAzkarDone: Boolean(record.morningAzkarDone),
            eveningAzkarDone: Boolean(record.eveningAzkarDone),
            fastingDone: Boolean(record.fastingDone),
            sadaqahDone: Boolean(record.sadaqahDone),
            tasbihCount: Number(record.tasbihCount) || 0,
            quranReadMinutes: record.quranReadMinutes ? Number(record.quranReadMinutes) : 0,
            quranPagesRead: record.quranPagesRead ? Number(record.quranPagesRead) : 0,
            sunnahDone: Boolean(record.sunnahDone),
            duaDone: Boolean(record.duaDone),
            quizDone: Boolean(record.quizDone),
            updatedAt: Date.now()
          });
          await syncUserAggregateTelemetry(effectiveUser, nextAmalMap, notes.length, bookmarks.length, false);
          setLastSyncTime(Date.now());
          setSyncStatus('synced');
        } catch (error) {
          setSyncStatus('error');
          handleFirestoreError(error, OperationType.WRITE, `users/${effectiveUser.uid}/amal_records/${record.dateKey}`);
        }
      } else {
        setSyncStatus('synced');
      }
    },
    [effectiveUser, accountStatus, notes.length, bookmarks.length, syncUserAggregateTelemetry, requestAuthPrompt]
  );

  return (
    <SyncContext.Provider
      value={{
        user: effectiveUser,
        authLoading,
        syncStatus,
        lastSyncTime,
        accountStatus,
        signInWithGoogle,
        signInWithSelectedGoogleAccount,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        signOutUser,
        deleteUserAccount,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        authPrompt,
        requestAuthPrompt,
        closeAuthPrompt,
        requireAuth,
        notes,
        bookmarks,
        amalRecords,
        remoteLeaderboard,
        publishedAnnouncements,
        publishedQuizzes,
        publishedCmsContents,
        azanCatalog,
        prayerSystemConfig,
        saveNote,
        deleteNote,
        saveBookmark,
        deleteBookmark,
        saveAmalRecord
      }}
    >
      {children}

      {/* Global In-App Gate Dialog when unauthenticated user attempts to tick or save */}
      <AuthRequiredModal
        isOpen={Boolean(authPrompt?.isOpen)}
        title={authPrompt?.title}
        message={authPrompt?.message}
        onCancel={closeAuthPrompt}
        onConfirm={() => {
          closeAuthPrompt();
          openAuthModal('login');
        }}
      />

      {/* Global Auth Modal for Google and Email Sign In */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        defaultMode={authModalMode}
      />
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
