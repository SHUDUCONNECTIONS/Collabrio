import { useState, useEffect, useRef } from "react";
import {
  Box, Typography, TextField, IconButton, Avatar, Paper,
  InputAdornment, Chip, Divider, CircularProgress, useTheme, alpha,
  List, ListItem, ListItemButton, ListItemAvatar, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Tooltip, Select, MenuItem, FormControl, InputLabel,
  Checkbox, OutlinedInput,
} from "@mui/material";
import {
  Send as SendIcon,
  FiberManualRecord as DotIcon,
  Add as AddIcon,
  AttachFile as AttachIcon,
  Lock as LockIcon,
  Forum as DMIcon,
  InsertDriveFile as FileIcon,
  Download as DownloadIcon,
  Groups as GeneralIcon,
  PersonAdd as NewDMIcon,
} from "@mui/icons-material";
import {
  collection, addDoc, onSnapshot, orderBy, query, limit,
  doc, getDoc, getDocs, setDoc, where,
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL,
} from "firebase/storage";
import { auth, db, storage } from "../../utils/firebase";
import { tokens } from "../../theme";

// ── helpers ──────────────────────────────────────────────────────────────────

const isSameDay = (a, b) => {
  const da = a?.toDate ? a.toDate() : new Date(a ?? 0);
  const db2 = b?.toDate ? b.toDate() : new Date(b ?? 0);
  return da.toDateString() === db2.toDateString();
};

const dateLabel = (ts) => {
  const d = ts?.toDate ? ts.toDate() : new Date(ts ?? 0);
  const now = new Date();
  if (isSameDay(d, now)) return "Today";
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (isSameDay(d, y)) return "Yesterday";
  return d.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
};

const timeStr = (ts) => {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const avatarBg = (name = "") => {
  const p = ["#1a8fff", "#00cfa5", "#b133cd", "#f58d3c", "#ffc107", "#ef5350", "#26c6da"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return p[Math.abs(h) % p.length];
};

const DM_ID = (a, b) => [a, b].sort().join("__");

// ── Link + file renderer ──────────────────────────────────────────────────────

const URL_RE = /(https?:\/\/[^\s]+)/g;

const MessageContent = ({ msg, colors }) => {
  if (msg.type === "file") {
    const isImage = msg.fileType?.startsWith("image/");
    return (
      <Box
        sx={{
          mt: 0.5,
          p: 1,
          bgcolor: alpha(colors.primary[500], 0.6),
          borderRadius: 2,
          border: `1px solid ${alpha(colors.grey[500], 0.2)}`,
          maxWidth: 260,
        }}
      >
        {isImage ? (
          <Box>
            <img
              src={msg.fileUrl}
              alt={msg.fileName}
              style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 6, display: "block" }}
            />
            <Typography variant="caption" color={colors.grey[400]} mt={0.5} display="block">
              {msg.fileName}
            </Typography>
          </Box>
        ) : (
          <Box display="flex" alignItems="center" gap={1}>
            <FileIcon sx={{ color: colors.blueAccent[400], fontSize: 28 }} />
            <Box flex={1} minWidth={0}>
              <Typography
                variant="body2"
                fontWeight={600}
                color={colors.grey[100]}
                noWrap
                title={msg.fileName}
              >
                {msg.fileName}
              </Typography>
              {msg.fileSize && (
                <Typography variant="caption" color={colors.grey[400]}>
                  {(msg.fileSize / 1024).toFixed(1)} KB
                </Typography>
              )}
            </Box>
            <Tooltip title="Download">
              <IconButton
                size="small"
                component="a"
                href={msg.fileUrl}
                target="_blank"
                download={msg.fileName}
                sx={{ color: colors.blueAccent[400] }}
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    );
  }

  // Plain text with clickable links
  const parts = msg.text?.split(URL_RE) || [];
  return (
    <Typography variant="body2" sx={{ color: colors.grey[100], lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {parts.map((part, i) =>
        URL_RE.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: colors.blueAccent[300], textDecoration: "underline" }}
          >
            {part}
          </a>
        ) : (
          part
        )
      )}
    </Typography>
  );
};

// ── Message thread ────────────────────────────────────────────────────────────

const MessageThread = ({ collectionPath, chatName, chatType, colors, isDark, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!collectionPath) return;
    const q = query(collection(db, collectionPath), orderBy("createdAt", "asc"), limit(300));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [collectionPath]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [messages]);

  const send = async (payload) => {
    if (!collectionPath) return;
    setSending(true);
    try {
      await addDoc(collection(db, collectionPath), {
        authorId: currentUser.uid,
        authorName: currentUser.name,
        authorInitial: currentUser.initial,
        createdAt: new Date(),
        ...payload,
      });
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setText("");
    await send({ text: t, type: "text" });
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const path = `chat-files/${collectionPath.replace(/\//g, "_")}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, file);
      await new Promise((res, rej) => task.on("state_changed", null, rej, res));
      const url = await getDownloadURL(task.snapshot.ref);
      await send({
        type: "file",
        text: "",
        fileUrl: url,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storagePath: path,
      });
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const renderMessages = () => {
    const out = [];
    let lastDate = null;

    messages.forEach((msg, i) => {
      const ts = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt ?? 0);
      const isMe = msg.authorId === currentUser?.uid;

      if (!lastDate || !isSameDay(lastDate, ts)) {
        lastDate = ts;
        out.push(
          <Box key={`d${i}`} display="flex" alignItems="center" gap={2} my={1.5}>
            <Divider sx={{ flex: 1, borderColor: alpha(colors.grey[500], 0.2) }} />
            <Typography variant="caption" sx={{ px: 1.5, py: 0.3, borderRadius: 10, bgcolor: alpha(colors.primary[400], 0.8), color: colors.grey[400], fontSize: "0.68rem", fontWeight: 600, whiteSpace: "nowrap" }}>
              {dateLabel(msg.createdAt)}
            </Typography>
            <Divider sx={{ flex: 1, borderColor: alpha(colors.grey[500], 0.2) }} />
          </Box>
        );
      }

      const prev = messages[i - 1];
      const prevTs = prev?.createdAt?.toDate ? prev.createdAt.toDate() : new Date(prev?.createdAt ?? 0);
      const grouped = prev && prev.authorId === msg.authorId && isSameDay(prevTs, ts) && (ts - prevTs) < 5 * 60 * 1000;

      out.push(
        <Box key={msg.id} sx={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", gap: 1, mb: grouped ? 0.3 : 1.2, px: 1 }}>
          <Box sx={{ width: 32, flexShrink: 0 }}>
            {!grouped && !isMe && (
              <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: avatarBg(msg.authorName) }}>
                {msg.authorInitial}
              </Avatar>
            )}
          </Box>
          <Box sx={{ maxWidth: "68%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
            {!grouped && !isMe && (
              <Typography variant="caption" sx={{ mb: 0.3, ml: 0.5, fontWeight: 700, color: avatarBg(msg.authorName) }}>
                {msg.authorName}
              </Typography>
            )}
            <Box sx={{
              px: msg.type === "file" ? 1 : 1.5,
              py: msg.type === "file" ? 0.5 : 0.8,
              borderRadius: isMe ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
              bgcolor: isMe ? alpha(colors.blueAccent[500], isDark ? 0.22 : 0.14) : isDark ? colors.primary[400] : "#fff",
              border: `1px solid ${isMe ? alpha(colors.blueAccent[400], 0.3) : alpha(colors.grey[500], 0.12)}`,
            }}>
              <MessageContent msg={msg} colors={colors} />
            </Box>
            <Typography variant="caption" sx={{ mt: 0.2, mx: 0.5, color: colors.grey[500], fontSize: "0.6rem" }}>
              {timeStr(msg.createdAt)}
            </Typography>
          </Box>
        </Box>
      );
    });
    return out;
  };

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 1.5, display: "flex", flexDirection: "column" }}>
        {messages.length === 0 && (
          <Box flex={1} display="flex" alignItems="center" justifyContent="center" flexDirection="column" gap={1} mt={8}>
            <Typography variant="h6" color={colors.grey[400]}>No messages yet</Typography>
            <Typography variant="body2" color={colors.grey[500]}>Start the conversation 👋</Typography>
          </Box>
        )}
        {renderMessages()}
        <div ref={bottomRef} />
      </Box>

      {/* Input */}
      <Paper elevation={0} sx={{ m: 1.5, mt: 0, borderRadius: 3, bgcolor: isDark ? colors.primary[400] : "#fff", border: `1px solid ${alpha(colors.grey[500], 0.18)}` }}>
        <TextField
          fullWidth multiline maxRows={5}
          placeholder={`Message ${chatType === "dm" ? "" : "#"}${chatName}…  (Enter to send)`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          variant="standard"
          sx={{
            px: 2, pt: 1.5, pb: 0.5,
            "& .MuiInputBase-root": { color: isDark ? colors.grey[100] : colors.grey[200] },
            "& .MuiInput-underline:before, & .MuiInput-underline:after": { display: "none" },
          }}
          InputProps={{
            disableUnderline: true,
            startAdornment: (
              <InputAdornment position="start">
                <Tooltip title="Attach file or image">
                  <span>
                    <IconButton size="small" onClick={() => fileRef.current?.click()} disabled={uploading} sx={{ color: colors.grey[400], "&:hover": { color: colors.blueAccent[400] } }}>
                      {uploading ? <CircularProgress size={16} /> : <AttachIcon sx={{ fontSize: 18 }} />}
                    </IconButton>
                  </span>
                </Tooltip>
                <input ref={fileRef} type="file" hidden onChange={handleFile} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end" sx={{ mb: 1 }}>
                <IconButton onClick={handleSend} disabled={!text.trim() || sending} sx={{ bgcolor: text.trim() ? colors.blueAccent[500] : "transparent", color: text.trim() ? "#fff" : colors.grey[500], width: 34, height: 34, transition: "all 0.2s", "&:hover": { bgcolor: text.trim() ? colors.blueAccent[400] : "transparent" } }}>
                  {sending ? <CircularProgress size={15} color="inherit" /> : <SendIcon sx={{ fontSize: 17 }} />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Paper>
    </Box>
  );
};

// ── Main ChatRoom page ────────────────────────────────────────────────────────

const ChatRoom = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDark = theme.palette.mode === "dark";

  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [rooms, setRooms] = useState([]); // private rooms
  const [dms, setDms] = useState([]);
  const [onlineIds, setOnlineIds] = useState(new Set());

  // selected chat: { type: 'general' | 'room' | 'dm', id, name, collectionPath }
  const [selected, setSelected] = useState(null);

  // Dialogs
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [newDMOpen, setNewDMOpen] = useState(false);

  // Create room form
  const [roomName, setRoomName] = useState("");
  const [roomMembers, setRoomMembers] = useState([]);
  const [creatingRoom, setCreatingRoom] = useState(false);

  // ── current user profile ───────────────────────────────────────────────────
  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    getDoc(doc(db, "users", u.uid)).then((snap) => {
      const d = snap.data() || {};
      const name = `${d.firstName || ""} ${d.surname || ""}`.trim() || u.displayName || u.email;
      setCurrentUser({ uid: u.uid, name, initial: name.charAt(0).toUpperCase(), email: u.email });
    });
  }, []);

  // ── fetch all users (for DM picker & room member selection) ────────────────
  useEffect(() => {
    getDocs(collection(db, "users")).then((snap) => {
      setAllUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // ── online presence ────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users"), where("online", "==", true)),
      (snap) => setOnlineIds(new Set(snap.docs.map((d) => d.id)))
    );
    return () => unsub();
  }, []);

  // ── private rooms user belongs to ─────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(
      query(collection(db, "chatRooms"), where("members", "array-contains", currentUser.uid)),
      (snap) => setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [currentUser]);

  // ── DMs for current user ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(
      query(collection(db, "directMessages"), where("members", "array-contains", currentUser.uid)),
      (snap) => setDms(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [currentUser]);

  // ── create private room ───────────────────────────────────────────────────
  const handleCreateRoom = async () => {
    if (!roomName.trim() || !currentUser) return;
    setCreatingRoom(true);
    try {
      const members = [...new Set([currentUser.uid, ...roomMembers])];
      const memberDetails = members.map((uid) => {
        const u = allUsers.find((u) => u.id === uid);
        return { uid, name: u ? `${u.firstName || ""} ${u.surname || ""}`.trim() : uid };
      });
      const ref2 = await addDoc(collection(db, "chatRooms"), {
        name: roomName.trim(),
        members,
        memberDetails,
        createdBy: currentUser.uid,
        createdAt: new Date(),
      });
      setSelected({ type: "room", id: ref2.id, name: roomName.trim(), collectionPath: `chatRooms/${ref2.id}/messages` });
      setCreateRoomOpen(false);
      setRoomName("");
      setRoomMembers([]);
    } finally {
      setCreatingRoom(false);
    }
  };

  // ── start DM ─────────────────────────────────────────────────────────────
  const handleStartDM = async (targetUser) => {
    if (!currentUser) return;
    const dmId = DM_ID(currentUser.uid, targetUser.id);
    const dmRef = doc(db, "directMessages", dmId);
    const snap = await getDoc(dmRef);
    if (!snap.exists()) {
      await setDoc(dmRef, {
        members: [currentUser.uid, targetUser.id],
        memberNames: {
          [currentUser.uid]: currentUser.name,
          [targetUser.id]: `${targetUser.firstName || ""} ${targetUser.surname || ""}`.trim(),
        },
        createdAt: new Date(),
      });
    }
    const otherName = `${targetUser.firstName || ""} ${targetUser.surname || ""}`.trim();
    setSelected({ type: "dm", id: dmId, name: otherName, collectionPath: `directMessages/${dmId}/messages` });
    setNewDMOpen(false);
  };

  // ── sidebar item ──────────────────────────────────────────────────────────
  const SidebarItem = ({ icon, label, sublabel, isOnline, onClick, active }) => (
    <ListItem disablePadding>
      <ListItemButton
        onClick={onClick}
        sx={{
          borderRadius: 2,
          mx: 0.5,
          py: 0.8,
          bgcolor: active ? alpha(colors.blueAccent[500], 0.15) : "transparent",
          "&:hover": { bgcolor: alpha(colors.blueAccent[500], 0.1) },
        }}
      >
        <ListItemAvatar sx={{ minWidth: 38 }}>
          <Box sx={{ position: "relative", width: 28, height: 28 }}>
            {typeof icon === "string" ? (
              <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: avatarBg(label) }}>
                {icon}
              </Avatar>
            ) : (
              <Box sx={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: active ? colors.blueAccent[400] : colors.grey[400] }}>
                {icon}
              </Box>
            )}
            {isOnline !== undefined && (
              <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderRadius: "50%", bgcolor: isOnline ? "#44b700" : colors.grey[600], border: `1.5px solid ${colors.primary[500]}` }} />
            )}
          </Box>
        </ListItemAvatar>
        <ListItemText
          primary={<Typography variant="body2" fontWeight={active ? 700 : 500} color={active ? colors.blueAccent[300] : colors.grey[200]} noWrap>{label}</Typography>}
          secondary={sublabel && <Typography variant="caption" color={colors.grey[500]} noWrap>{sublabel}</Typography>}
        />
      </ListItemButton>
    </ListItem>
  );

  const otherDMUser = (dm) => {
    if (!currentUser) return {};
    const otherId = dm.members?.find((id) => id !== currentUser.uid);
    const u = allUsers.find((u) => u.id === otherId);
    const name = u ? `${u.firstName || ""} ${u.surname || ""}`.trim() : dm.memberNames?.[otherId] || "Unknown";
    return { id: otherId, name };
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 64px)", m: "10px 20px", gap: 1.5, overflow: "hidden" }}>

      {/* ── LEFT SIDEBAR ── */}
      <Paper
        elevation={2}
        sx={{
          width: 240,
          flexShrink: 0,
          borderRadius: 3,
          bgcolor: isDark ? colors.primary[400] : "#fff",
          border: `1px solid ${alpha(colors.grey[500], 0.12)}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, pb: 1, borderBottom: `1px solid ${alpha(colors.grey[500], 0.12)}` }}>
          <Typography variant="h6" fontWeight={700} color={colors.grey[100]}>Team Chat</Typography>
          <Box display="flex" alignItems="center" gap={0.5} mt={0.3}>
            <DotIcon sx={{ fontSize: 8, color: "#44b700" }} />
            <Typography variant="caption" color={colors.grey[400]}>{onlineIds.size} online</Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", py: 1 }}>
          {/* General */}
          <Typography variant="caption" sx={{ px: 2, color: colors.grey[500], fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
            Channels
          </Typography>
          <List dense>
            <SidebarItem
              icon={<GeneralIcon sx={{ fontSize: 18 }} />}
              label="General"
              onClick={() => setSelected({ type: "general", id: "general", name: "General", collectionPath: "globalChat" })}
              active={selected?.id === "general"}
            />
            {rooms.map((room) => (
              <SidebarItem
                key={room.id}
                icon={<LockIcon sx={{ fontSize: 16 }} />}
                label={room.name}
                sublabel={`${room.members?.length || 0} members`}
                onClick={() => setSelected({ type: "room", id: room.id, name: room.name, collectionPath: `chatRooms/${room.id}/messages` })}
                active={selected?.id === room.id}
              />
            ))}
          </List>

          {/* Create room button */}
          <Box px={1.5} mb={1}>
            <Button
              fullWidth size="small" startIcon={<AddIcon />}
              onClick={() => setCreateRoomOpen(true)}
              sx={{ textTransform: "none", justifyContent: "flex-start", color: colors.grey[400], fontSize: "0.75rem", "&:hover": { color: colors.blueAccent[400], bgcolor: alpha(colors.blueAccent[500], 0.08) } }}
            >
              New private room
            </Button>
          </Box>

          <Divider sx={{ mx: 1.5, borderColor: alpha(colors.grey[500], 0.15) }} />

          {/* DMs */}
          <Typography variant="caption" sx={{ px: 2, mt: 1.5, display: "block", color: colors.grey[500], fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
            Direct Messages
          </Typography>
          <List dense>
            {dms.map((dm) => {
              const other = otherDMUser(dm);
              return (
                <SidebarItem
                  key={dm.id}
                  icon={other.name?.charAt(0).toUpperCase() || "?"}
                  label={other.name}
                  isOnline={onlineIds.has(other.id)}
                  onClick={() => setSelected({ type: "dm", id: dm.id, name: other.name, collectionPath: `directMessages/${dm.id}/messages` })}
                  active={selected?.id === dm.id}
                />
              );
            })}
          </List>

          <Box px={1.5} mb={1}>
            <Button
              fullWidth size="small" startIcon={<NewDMIcon />}
              onClick={() => setNewDMOpen(true)}
              sx={{ textTransform: "none", justifyContent: "flex-start", color: colors.grey[400], fontSize: "0.75rem", "&:hover": { color: colors.blueAccent[400], bgcolor: alpha(colors.blueAccent[500], 0.08) } }}
            >
              New direct message
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* ── MAIN CHAT AREA ── */}
      <Paper
        elevation={2}
        sx={{
          flex: 1,
          borderRadius: 3,
          bgcolor: isDark ? colors.primary[500] : "#f7f4ff",
          border: `1px solid ${alpha(colors.grey[500], 0.1)}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {!selected ? (
          <Box flex={1} display="flex" alignItems="center" justifyContent="center" flexDirection="column" gap={1.5}>
            <DMIcon sx={{ fontSize: 48, color: colors.grey[600] }} />
            <Typography variant="h6" color={colors.grey[400]}>Select a channel or conversation</Typography>
            <Typography variant="body2" color={colors.grey[500]}>Pick something from the sidebar to start chatting.</Typography>
          </Box>
        ) : (
          <>
            {/* Chat header */}
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${alpha(colors.grey[500], 0.12)}`, display: "flex", alignItems: "center", gap: 1 }}>
              {selected.type === "dm" ? (
                <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: avatarBg(selected.name) }}>
                  {selected.name?.charAt(0)}
                </Avatar>
              ) : selected.type === "general" ? (
                <GeneralIcon sx={{ color: colors.blueAccent[400], fontSize: 20 }} />
              ) : (
                <LockIcon sx={{ color: colors.blueAccent[400], fontSize: 18 }} />
              )}
              <Typography variant="h6" fontWeight={700} color={colors.grey[100]}>{selected.name}</Typography>
              {selected.type === "dm" && (() => {
                const dm = dms.find((d) => d.id === selected.id);
                const other = dm ? otherDMUser(dm) : null;
                return other ? (
                  <Chip
                    size="small"
                    label={onlineIds.has(other.id) ? "Online" : "Offline"}
                    sx={{
                      height: 18, fontSize: "0.62rem", fontWeight: 700,
                      bgcolor: onlineIds.has(other.id) ? alpha("#44b700", 0.15) : alpha(colors.grey[500], 0.15),
                      color: onlineIds.has(other.id) ? "#44b700" : colors.grey[400],
                    }}
                  />
                ) : null;
              })()}
              {selected.type === "room" && (() => {
                const room = rooms.find((r) => r.id === selected.id);
                return room ? (
                  <Typography variant="caption" color={colors.grey[500]}>
                    {room.members?.length} members
                  </Typography>
                ) : null;
              })()}
            </Box>

            <MessageThread
              collectionPath={selected.collectionPath}
              chatName={selected.name}
              chatType={selected.type}
              colors={colors}
              isDark={isDark}
              currentUser={currentUser}
            />
          </>
        )}
      </Paper>

      {/* ── CREATE ROOM DIALOG ── */}
      <Dialog open={createRoomOpen} onClose={() => setCreateRoomOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <LockIcon sx={{ color: colors.blueAccent[400] }} />
            <Typography fontWeight={700}>Create Private Room</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <TextField
            autoFocus
            label="Room name"
            fullWidth
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="e.g. Design Team, Sprint Planning…"
          />
          <FormControl fullWidth>
            <InputLabel>Invite members</InputLabel>
            <Select
              multiple
              value={roomMembers}
              onChange={(e) => setRoomMembers(e.target.value)}
              input={<OutlinedInput label="Invite members" />}
              renderValue={(selected) =>
                allUsers
                  .filter((u) => selected.includes(u.id))
                  .map((u) => `${u.firstName || ""} ${u.surname || ""}`.trim())
                  .join(", ")
              }
            >
              {allUsers
                .filter((u) => u.id !== currentUser?.uid)
                .map((u) => {
                  const name = `${u.firstName || ""} ${u.surname || ""}`.trim();
                  return (
                    <MenuItem key={u.id} value={u.id}>
                      <Checkbox checked={roomMembers.includes(u.id)} />
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: avatarBg(name) }}>
                          {name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">{name}</Typography>
                          <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                        </Box>
                        {onlineIds.has(u.id) && (
                          <DotIcon sx={{ fontSize: 10, color: "#44b700", ml: "auto" }} />
                        )}
                      </Box>
                    </MenuItem>
                  );
                })}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            Only invited members can see and join this room. You are added automatically.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateRoomOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateRoom}
            disabled={!roomName.trim() || creatingRoom}
          >
            {creatingRoom ? "Creating…" : "Create Room"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── NEW DM DIALOG ── */}
      <Dialog open={newDMOpen} onClose={() => setNewDMOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={700}>New Direct Message</DialogTitle>
        <DialogContent sx={{ pt: "8px !important" }}>
          <List>
            {allUsers
              .filter((u) => u.id !== currentUser?.uid)
              .map((u) => {
                const name = `${u.firstName || ""} ${u.surname || ""}`.trim();
                const isOnline = onlineIds.has(u.id);
                return (
                  <ListItem key={u.id} disablePadding>
                    <ListItemButton onClick={() => handleStartDM(u)} sx={{ borderRadius: 2, py: 1 }}>
                      <ListItemAvatar>
                        <Box sx={{ position: "relative", width: 36, height: 36 }}>
                          <Avatar sx={{ width: 36, height: 36, bgcolor: avatarBg(name) }}>
                            {name.charAt(0)}
                          </Avatar>
                          <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", bgcolor: isOnline ? "#44b700" : colors.grey[600], border: `2px solid ${isDark ? colors.primary[500] : "#f7f4ff"}` }} />
                        </Box>
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Typography variant="body2" fontWeight={600}>{name}</Typography>}
                        secondary={<Typography variant="caption" color="text.secondary">{u.position || u.email}</Typography>}
                      />
                      <Chip
                        label={isOnline ? "Online" : "Offline"}
                        size="small"
                        sx={{
                          height: 18, fontSize: "0.6rem",
                          bgcolor: isOnline ? alpha("#44b700", 0.12) : alpha(colors.grey[500], 0.12),
                          color: isOnline ? "#44b700" : colors.grey[500],
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewDMOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatRoom;
