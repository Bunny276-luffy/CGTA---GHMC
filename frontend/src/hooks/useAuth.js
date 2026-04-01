import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export function useAuth() {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Fetch user role from Firestore
                try {
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        setRole(userDocSnap.data().role);
                    } else {
                        console.error("User document not found in Firestore!");
                        setRole('citizen'); // Default fallback
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    setRole('citizen');
                }
            } else {
                setRole(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    return { user, role, loading };
}
