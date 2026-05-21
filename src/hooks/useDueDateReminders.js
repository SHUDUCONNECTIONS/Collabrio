import { useEffect } from "react";
import {
  collection, getDocs, addDoc, query, where,
} from "firebase/firestore";
import { auth, db } from "../utils/firebase";

// Runs once per session and creates "due_reminder" notifications for:
//   - tasks assigned to the user that are due today or tomorrow (not done)
//   - boards the user is a member of that are due today or tomorrow (not completed)
// Deduplicates: one reminder per task/board per day.

const dayStart = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(0, 0, 0, 0);
  return d;
};

const dayEnd = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(23, 59, 59, 999);
  return d;
};

const alreadyNotified = async (userId, refId, type) => {
  const todayStart = dayStart(0);
  const snap = await getDocs(
    query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("refId", "==", refId),
      where("type", "==", type),
      where("timestamp", ">=", todayStart)
    )
  );
  return !snap.empty;
};

export const useDueDateReminders = () => {
  useEffect(() => {
    const run = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const today0 = dayStart(0);
      const today23 = dayEnd(0);
      const tomorrow0 = dayStart(1);
      const tomorrow23 = dayEnd(1);

      const withinWindow = (ts) => {
        if (!ts) return false;
        const d = ts?.toDate ? ts.toDate() : new Date(ts);
        return (d >= today0 && d <= today23) || (d >= tomorrow0 && d <= tomorrow23);
      };

      const dayLabel = (ts) => {
        const d = ts?.toDate ? ts.toDate() : new Date(ts);
        return d >= today0 && d <= today23 ? "today" : "tomorrow";
      };

      try {
        // ── Board deadline reminders ──────────────────────────────────────
        const boardsSnap = await getDocs(collection(db, "boards"));
        for (const d of boardsSnap.docs) {
          const board = d.data();
          const isMember = (board.memberIds || []).includes(user.uid);
          const notDone = !["completed", "Completed"].includes(board.status);
          if (!isMember || !notDone || !withinWindow(board.deadline)) continue;

          const already = await alreadyNotified(user.uid, d.id, "due_reminder_board");
          if (already) continue;

          await addDoc(collection(db, "notifications"), {
            userId: user.uid,
            type: "due_reminder_board",
            refId: d.id,
            message: `Board "${board.boardName}" is due ${dayLabel(board.deadline)}.`,
            read: false,
            timestamp: new Date(),
          });
        }

        // ── Task due date reminders ───────────────────────────────────────
        for (const boardDoc of boardsSnap.docs) {
          const board = boardDoc.data();
          if (!(board.memberIds || []).includes(user.uid)) continue;

          const tasksSnap = await getDocs(
            collection(db, `boards/${boardDoc.id}/tasks`)
          );

          for (const td of tasksSnap.docs) {
            const task = td.data();
            if (task.assignedTo?.id !== user.uid) continue;
            if (task.status === "done") continue;
            if (!withinWindow(task.dueDate ? new Date(task.dueDate) : null)) continue;

            const already = await alreadyNotified(user.uid, td.id, "due_reminder_task");
            if (already) continue;

            await addDoc(collection(db, "notifications"), {
              userId: user.uid,
              type: "due_reminder_task",
              refId: td.id,
              boardId: boardDoc.id,
              message: `Task "${task.title}" in "${board.boardName}" is due ${dayLabel(new Date(task.dueDate))}.`,
              read: false,
              timestamp: new Date(),
            });
          }
        }
      } catch (err) {
        console.error("Due date reminder error:", err);
      }
    };

    // Small delay so Firebase auth has time to initialise
    const timer = setTimeout(run, 3000);
    return () => clearTimeout(timer);
  }, []);
};
