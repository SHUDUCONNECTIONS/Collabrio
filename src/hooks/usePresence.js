import { useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../utils/firebase";

export const usePresence = () => {
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    const setOnline = () =>
      updateDoc(userRef, { online: true, lastSeen: serverTimestamp() }).catch(() => {});
    const setOffline = () =>
      updateDoc(userRef, { online: false, lastSeen: serverTimestamp() }).catch(() => {});

    setOnline();

    const handleVisibilityChange = () => {
      if (document.hidden) setOffline();
      else setOnline();
    };

    const handleBeforeUnload = () => setOffline();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      setOffline();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
};
