import { useState, useEffect } from "react";
import FullCalendar, { formatDate } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import {
  Box, List, ListItem, ListItemText, Typography, useTheme,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Checkbox, ListItemAvatar, Avatar, Chip, Divider,
  IconButton, Tooltip, CircularProgress, alpha,
} from "@mui/material";
import {
  Add as AddIcon,
  Close as CloseIcon,
  VideoCall as VideoIcon,
  LocationOn as LocationIcon,
  Groups as InPersonIcon,
  Phone as PhoneIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Notes as NotesIcon,
} from "@mui/icons-material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import Header from "../../components/Header";
import { tokens } from "../../theme";
import { db, auth } from "../../utils/firebase";
import {
  collection, getDocs, addDoc, deleteDoc,
  doc, onSnapshot, query, where, Timestamp,
} from "firebase/firestore";

const MEETING_COLOR = "#7c5cbf";
const BOARD_COLORS = {
  completed: "#00cfa5",
  "in-progress": "#1a8fff",
  default: "#f58d3c",
  urgent: "#ef5350",
};

const TYPE_OPTIONS = [
  { value: "video",     label: "Video Call",   icon: <VideoIcon fontSize="small" /> },
  { value: "in-person", label: "In Person",    icon: <InPersonIcon fontSize="small" /> },
  { value: "phone",     label: "Phone Call",   icon: <PhoneIcon fontSize="small" /> },
];

const avatarBg = (name = "") => {
  const p = ["#1a8fff", "#00cfa5", "#b133cd", "#f58d3c", "#ffc107"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return p[Math.abs(h) % p.length];
};

const Calendar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDark = theme.palette.mode === "dark";

  const [boardEvents, setBoardEvents] = useState([]);
  const [meetingEvents, setMeetingEvents] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Schedule dialog
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedStart, setSelectedStart] = useState(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingType, setMeetingType] = useState("video");
  const [location, setLocation] = useState("");
  const [startDT, setStartDT] = useState(null);
  const [endDT, setEndDT] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [saving, setSaving] = useState(false);

  // View dialog (click existing meeting)
  const [viewOpen, setViewOpen] = useState(false);
  const [viewedMeeting, setViewedMeeting] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── load current user ────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) return;
      const snap = await getDocs(query(collection(db, "users"), where("__name__", "==", u.uid)));
      // simpler: just use auth user + fetch profile
      setCurrentUser({ uid: u.uid, email: u.email });
    });
    return () => unsub();
  }, []);

  // ── load all users (for invitee picker) ──────────────────────────────────
  useEffect(() => {
    getDocs(collection(db, "users")).then((snap) =>
      setAllUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  // ── board deadline events ────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    getDocs(collection(db, "boards")).then((snap) => {
      const today = new Date(); today.setHours(0,0,0,0);
      const events = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((b) => b.members?.some((m) => m.id === currentUser.uid) && b.deadline)
        .map((b) => {
          const deadline = b.deadline.toDate?.() ?? new Date(b.deadline);
          const isToday = deadline.toDateString() === today.toDateString();
          const color = isToday && b.status !== "completed"
            ? BOARD_COLORS.urgent
            : BOARD_COLORS[b.status] ?? BOARD_COLORS.default;
          return {
            id: b.id,
            title: b.boardName,
            date: deadline,
            backgroundColor: color,
            borderColor: color,
            allDay: true,
            extendedProps: { type: "board", status: b.status },
          };
        });
      setBoardEvents(events);
      setLoading(false);
    });
  }, [currentUser]);

  // ── meeting events (real-time) ───────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(
      query(collection(db, "meetings"), where("attendeeIds", "array-contains", currentUser.uid)),
      (snap) => {
        setMeetingEvents(
          snap.docs.map((d) => {
            const m = d.data();
            const start = m.startDate?.toDate?.() ?? new Date(m.startDate);
            const end = m.endDate?.toDate?.() ?? new Date(m.endDate);
            return {
              id: d.id,
              title: m.title,
              start,
              end,
              backgroundColor: MEETING_COLOR,
              borderColor: MEETING_COLOR,
              allDay: false,
              extendedProps: { type: "meeting", ...m },
            };
          })
        );
      }
    );
    return () => unsub();
  }, [currentUser]);

  const allEvents = [...boardEvents, ...meetingEvents];

  // ── open schedule dialog on date click ───────────────────────────────────
  const handleDateClick = (info) => {
    const start = new Date(info.date);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10, 0, 0, 0);
    setStartDT(start);
    setEndDT(end);
    setSelectedStart(start);
    setTitle("");
    setDescription("");
    setMeetingType("video");
    setLocation("");
    setAttendees(currentUser ? [currentUser.uid] : []);
    setScheduleOpen(true);
  };

  // ── click existing event ─────────────────────────────────────────────────
  const handleEventClick = (info) => {
    const props = info.event.extendedProps;
    if (props.type === "meeting") {
      setViewedMeeting({ id: info.event.id, title: info.event.title, ...props });
      setViewOpen(true);
    }
  };

  // ── save meeting ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim() || !startDT || !endDT) return;
    setSaving(true);
    try {
      const attendeeDetails = allUsers
        .filter((u) => attendees.includes(u.id))
        .map((u) => ({ id: u.id, name: `${u.firstName || ""} ${u.surname || ""}`.trim(), email: u.email }));

      const creatorUser = allUsers.find((u) => u.id === currentUser.uid);
      const creatorName = creatorUser
        ? `${creatorUser.firstName || ""} ${creatorUser.surname || ""}`.trim()
        : "Someone";

      const startFormatted = startDT.toLocaleString("en-ZA", {
        weekday: "short", day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit",
      });

      const meetingRef = await addDoc(collection(db, "meetings"), {
        title: title.trim(),
        description: description.trim(),
        meetingType,
        location: location.trim(),
        startDate: Timestamp.fromDate(startDT),
        endDate: Timestamp.fromDate(endDT),
        attendees: attendeeDetails,
        attendeeIds: attendees,
        createdBy: currentUser.uid,
        createdAt: new Date(),
      });

      // Send a notification to every invitee except the creator
      const notifPromises = attendees
        .filter((uid) => uid !== currentUser.uid)
        .map((uid) =>
          addDoc(collection(db, "notifications"), {
            userId: uid,
            type: "meeting_invite",
            message: `${creatorName} invited you to "${title.trim()}" on ${startFormatted}`,
            meetingId: meetingRef.id,
            read: false,
            timestamp: new Date(),
          })
        );
      await Promise.all(notifPromises);

      setScheduleOpen(false);
    } catch (err) {
      console.error("Error saving meeting:", err);
    } finally {
      setSaving(false);
    }
  };

  // ── delete meeting ───────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!viewedMeeting) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "meetings", viewedMeeting.id));
      setViewOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const fmtDT = (ts) => {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("en-ZA", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <Box m="20px" display="flex" alignItems="center" justifyContent="center" height="60vh">
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  return (
    <Box m="20px">
      <Header title="Calendar" subtitle="Board deadlines & team meetings" />

      {/* Blink animation */}
      <Box component="style">{`
        @keyframes blinker { 50% { opacity: 0; } }
        .blink-event { animation: blinker 1s linear infinite; }
      `}</Box>

      <Box display="flex" gap={2}>
        {/* ── Sidebar event list ── */}
        <Box
          sx={{
            width: 220,
            flexShrink: 0,
            bgcolor: colors.primary[400],
            borderRadius: 3,
            p: 2,
            maxHeight: "73vh",
            overflowY: "auto",
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6" fontWeight={700} color={colors.grey[100]}>Events</Typography>
            <Tooltip title="Schedule a meeting">
              <IconButton
                size="small"
                onClick={() => handleDateClick({ date: new Date() })}
                sx={{ bgcolor: MEETING_COLOR, color: "#fff", width: 26, height: 26, "&:hover": { bgcolor: "#6a4dab" } }}
              >
                <AddIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Legend */}
          <Box display="flex" flexDirection="column" gap={0.5} mb={1.5}>
            <Box display="flex" alignItems="center" gap={0.8}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: MEETING_COLOR }} />
              <Typography variant="caption" color={colors.grey[400]}>Meeting</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.8}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: BOARD_COLORS.default }} />
              <Typography variant="caption" color={colors.grey[400]}>Board deadline</Typography>
            </Box>
          </Box>

          <Divider sx={{ borderColor: alpha(colors.grey[500], 0.2), mb: 1 }} />

          <List dense disablePadding>
            {allEvents
              .sort((a, b) => new Date(a.date ?? a.start) - new Date(b.date ?? b.start))
              .map((event) => (
                <ListItem
                  key={event.id}
                  sx={{
                    mb: 0.8,
                    borderRadius: 2,
                    bgcolor: alpha(event.backgroundColor, 0.18),
                    borderLeft: `3px solid ${event.backgroundColor}`,
                    py: 0.6,
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="caption" fontWeight={600} color={colors.grey[100]} sx={{ display: "block", lineHeight: 1.3 }}>
                        {event.title}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color={colors.grey[400]}>
                        {formatDate(event.date ?? event.start, { month: "short", day: "numeric" })}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
          </List>
        </Box>

        {/* ── Full Calendar ── */}
        <Box flex={1} sx={{
          "& .fc": { color: colors.grey[100] },
          "& .fc-button": { bgcolor: `${colors.blueAccent[600]} !important`, border: "none !important", textTransform: "capitalize" },
          "& .fc-button-active": { bgcolor: `${colors.blueAccent[700]} !important` },
          "& .fc-daygrid-day:hover": { bgcolor: `${alpha(MEETING_COLOR, 0.08)} !important`, cursor: "pointer" },
          "& .fc-col-header-cell": { bgcolor: colors.blueAccent[700] },
          "& .fc-scrollgrid": { borderColor: `${alpha(colors.grey[500], 0.2)} !important` },
          "& td, & th": { borderColor: `${alpha(colors.grey[500], 0.15)} !important` },
        }}>
          <FullCalendar
            height="73vh"
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth",
            }}
            initialView="dayGridMonth"
            editable={false}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            events={allEvents}
          />
        </Box>
      </Box>

      {/* ── Schedule Meeting Dialog ── */}
      <Dialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <EventIcon sx={{ color: MEETING_COLOR }} />
            <Typography fontWeight={700}>Schedule Meeting</Typography>
          </Box>
          <IconButton size="small" onClick={() => setScheduleOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
          <TextField
            autoFocus label="Meeting title" fullWidth
            value={title} onChange={(e) => setTitle(e.target.value)}
            required error={!title.trim()}
          />

          <TextField
            label="Description (optional)" fullWidth multiline rows={2}
            value={description} onChange={(e) => setDescription(e.target.value)}
          />

          <Box display="flex" gap={2}>
            <DateTimePicker
              label="Start" value={startDT}
              onChange={(v) => {
                setStartDT(v);
                if (v && (!endDT || endDT <= v)) {
                  const e = new Date(v); e.setHours(e.getHours() + 1);
                  setEndDT(e);
                }
              }}
              slotProps={{ textField: { fullWidth: true, size: "small" } }}
            />
            <DateTimePicker
              label="End" value={endDT}
              onChange={(v) => setEndDT(v)}
              slotProps={{ textField: { fullWidth: true, size: "small" } }}
            />
          </Box>

          <Box display="flex" gap={2}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Meeting type</InputLabel>
              <Select value={meetingType} label="Meeting type" onChange={(e) => setMeetingType(e.target.value)}>
                {TYPE_OPTIONS.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    <Box display="flex" alignItems="center" gap={1}>{t.icon}{t.label}</Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small" label="Location / link (optional)" sx={{ flex: 1.5 }}
              value={location} onChange={(e) => setLocation(e.target.value)}
            />
          </Box>

          {/* Invitee picker */}
          <FormControl fullWidth size="small">
            <InputLabel>Invite team members</InputLabel>
            <Select
              multiple value={attendees}
              label="Invite team members"
              onChange={(e) => setAttendees(e.target.value)}
              renderValue={(sel) => (
                <Box display="flex" flexWrap="wrap" gap={0.5}>
                  {allUsers
                    .filter((u) => sel.includes(u.id))
                    .map((u) => {
                      const name = `${u.firstName || ""} ${u.surname || ""}`.trim();
                      return <Chip key={u.id} size="small" label={name} avatar={<Avatar sx={{ bgcolor: avatarBg(name) }}>{name.charAt(0)}</Avatar>} />;
                    })}
                </Box>
              )}
            >
              {allUsers.map((u) => {
                const name = `${u.firstName || ""} ${u.surname || ""}`.trim();
                return (
                  <MenuItem key={u.id} value={u.id}>
                    <Checkbox checked={attendees.includes(u.id)} />
                    <ListItemAvatar>
                      <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: avatarBg(name) }}>{name.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={name} secondary={u.position || u.email} />
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setScheduleOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!title.trim() || !startDT || !endDT || saving}
            sx={{ textTransform: "none", fontWeight: 600, bgcolor: MEETING_COLOR, "&:hover": { bgcolor: "#6a4dab" } }}
          >
            {saving ? <CircularProgress size={18} color="inherit" /> : "Schedule Meeting"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── View Meeting Dialog ── */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box display="flex" alignItems="center" gap={1}>
            <EventIcon sx={{ color: MEETING_COLOR }} />
            <Typography fontWeight={700}>{viewedMeeting?.title}</Typography>
          </Box>
          <IconButton size="small" onClick={() => setViewOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          {viewedMeeting && (
            <Box display="flex" flexDirection="column" gap={1.5}>
              {/* Type */}
              <Box display="flex" alignItems="center" gap={1}>
                {TYPE_OPTIONS.find((t) => t.value === viewedMeeting.meetingType)?.icon ?? <VideoIcon fontSize="small" />}
                <Typography variant="body2">{TYPE_OPTIONS.find((t) => t.value === viewedMeeting.meetingType)?.label ?? "Meeting"}</Typography>
              </Box>

              {/* Time */}
              <Box display="flex" alignItems="flex-start" gap={1}>
                <TimeIcon fontSize="small" sx={{ mt: 0.2, color: "text.secondary" }} />
                <Box>
                  <Typography variant="body2">{fmtDT(viewedMeeting.startDate)}</Typography>
                  <Typography variant="body2" color="text.secondary">→ {fmtDT(viewedMeeting.endDate)}</Typography>
                </Box>
              </Box>

              {/* Location */}
              {viewedMeeting.location && (
                <Box display="flex" alignItems="center" gap={1}>
                  <LocationIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  <Typography variant="body2">{viewedMeeting.location}</Typography>
                </Box>
              )}

              {/* Description */}
              {viewedMeeting.description && (
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <NotesIcon fontSize="small" sx={{ mt: 0.2, color: "text.secondary" }} />
                  <Typography variant="body2">{viewedMeeting.description}</Typography>
                </Box>
              )}

              <Divider />

              {/* Attendees */}
              <Box display="flex" alignItems="flex-start" gap={1}>
                <PersonIcon fontSize="small" sx={{ mt: 0.3, color: "text.secondary" }} />
                <Box display="flex" flexWrap="wrap" gap={0.5}>
                  {(viewedMeeting.attendees || []).map((a) => (
                    <Chip
                      key={a.id}
                      size="small"
                      label={a.name}
                      avatar={<Avatar sx={{ bgcolor: avatarBg(a.name) }}>{a.name?.charAt(0)}</Avatar>}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {viewedMeeting?.createdBy === currentUser?.uid && (
            <Button
              color="error" startIcon={deleting ? <CircularProgress size={14} /> : <DeleteIcon />}
              onClick={handleDelete} disabled={deleting}
              sx={{ textTransform: "none", mr: "auto" }}
            >
              Delete
            </Button>
          )}
          <Button onClick={() => setViewOpen(false)} sx={{ textTransform: "none" }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Calendar;
