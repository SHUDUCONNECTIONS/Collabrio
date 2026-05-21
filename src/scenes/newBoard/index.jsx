import { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  CircularProgress,
  ListItemText,
  Checkbox,
  ListItemIcon,
  Alert,
  IconButton,
  Chip,
  FormControlLabel,
  useTheme,
  Typography,
  Avatar,
  Paper,
  Tooltip,
  alpha,
} from "@mui/material";
import {
  ErrorOutline as CriticalIcon,
  NotificationsActive as ImportantIcon,
  LowPriority as MinorIcon,
  Groups as MembersIcon,
  CalendarToday as CalendarIcon,
  AttachFile as AttachIcon,
  Rocket as RocketIcon,
  ArrowBack as BackIcon,
} from "@mui/icons-material";
import { tokens } from "../../theme";
import { Formik } from "formik";
import * as yup from "yup";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth, storage } from "../../utils/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CancelIcon from "@mui/icons-material/Cancel";
import emailjs from '@emailjs/browser';

const avatarBg = (name = "") => {
  const p = ["#1a8fff", "#00cfa5", "#b133cd", "#f58d3c", "#ffc107", "#ef5350"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return p[Math.abs(h) % p.length];
};

const PRIORITIES = [
  { value: "Critical", label: "Critical", desc: "Needs immediate attention", icon: <CriticalIcon />, color: "#ef5350", bg: "#4a1010" },
  { value: "Important", label: "Important", desc: "High value, do soon", icon: <ImportantIcon />, color: "#ff9800", bg: "#4a3010" },
  { value: "Minor",    label: "Minor",    desc: "Nice to have", icon: <MinorIcon />, color: "#4caf50", bg: "#0f2e1a" },
];

const AddBoard = () => {
  const isNonMobile = useMediaQuery("(min-width:600px)");
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDark = theme.palette.mode === "dark";
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileUploading, setFileUploading] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);

  // EmailJS configuration - Replace with your actual values
  const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID;
  const EMAILJS_TEMPLATE_ID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
  const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

  useEffect(() => {
    // Initialize EmailJS
    emailjs.init(EMAILJS_PUBLIC_KEY);
    
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        const usersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersData);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Function to check if user exists in the system
  const checkUserExists = async (email) => {
    try {
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      const userExists = snapshot.docs.some(doc => doc.data().email === email);
      return userExists;
    } catch (error) {
      console.error("Error checking user existence:", error);
      return false; // Default to treating as new user if check fails
    }
  };

  // Function to send notification emails to board members
  const sendNotificationEmails = async (boardData, creatorName, memberEmails, boardId) => {
    if (!memberEmails || memberEmails.length === 0) {
      return { success: true, message: "No members to notify" };
    }

    setSendingEmails(true);
    const emailPromises = memberEmails.map(async (memberEmail) => {
      try {
        // Check if user exists in the system
        const userExists = await checkUserExists(memberEmail.email);
        
        // Determine the appropriate URL and messaging
        const boardUrl = `${window.location.origin}/boards/${boardId}`;
        const loginUrl = `${window.location.origin}/login`;
        const companyName = "Collabrio";
        const supportEmail = "support@collabrio.com";
        
        // Create simplified template parameters - avoid complex conditional logic
        const templateParams = {
          // EmailJS commonly expects these standard field names
          to_name: memberEmail.name || "User",
          to_email: memberEmail.email,
          from_name: creatorName || "Team Member",
          from_email: auth.currentUser?.email || supportEmail,
          reply_to: auth.currentUser?.email || supportEmail,
          
          // Board specific information
          board_name: boardData.boardName || "New Board",
          board_description: boardData.description || "No description provided",
          board_priority: boardData.priority || "Medium",
          deadline: boardData.deadline 
            ? new Date(boardData.deadline.seconds * 1000).toLocaleDateString()
            : "No deadline set",
          action_url: userExists ? boardUrl : loginUrl,
          
          // Company information
          company_name: companyName,
          support_email: supportEmail,
          
          // Message content
          message: `You have been invited to join the board "${boardData.boardName || 'New Board'}" by ${creatorName || 'a team member'}.`,
        };

        console.log("Sending email with params:", templateParams);

        const response = await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          templateParams,
          EMAILJS_PUBLIC_KEY
        );

        console.log(`Email sent successfully to ${memberEmail.email}:`, response);
        return { success: true, email: memberEmail.email, userType: userExists ? 'existing' : 'new' };
      } catch (error) {
        console.error(`Failed to send email to ${memberEmail.email}:`, error);
        // Log more details about the error
        if (error.status) {
          console.error(`EmailJS Error Status: ${error.status}, Text: ${error.text}`);
        }
        return { success: false, email: memberEmail.email, error: error.text || error.message };
      }
    });

    try {
      const results = await Promise.all(emailPromises);
      const failedEmails = results.filter(result => !result.success);
      const successEmails = results.filter(result => result.success);
      
      setSendingEmails(false);
      
      console.log(`Emails sent: ${successEmails.length} successful, ${failedEmails.length} failed`);
      
      if (failedEmails.length === 0) {
        return { success: true, message: "All notification emails sent successfully" };
      } else {
        return { 
          success: false, 
          message: `Failed to send emails to: ${failedEmails.map(f => f.email).join(", ")}` 
        };
      }
    } catch (error) {
      setSendingEmails(false);
      console.error("Error sending notification emails:", error);
      return { success: false, message: "Failed to send notification emails" };
    }
  };

  const handleFileUpload = async (files, uploaderName, boardId) => {
    if (!files || files.length === 0) return [];

    setFileUploading(true);
    try {
      const currentUser = auth.currentUser;
      const uploadPromises = files.map(async (file) => {
        const filename = `${uploaderName}_${Date.now()}_${file.name}`;
        const path = `documents/${boardId}/files/${filename}`;
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress =
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log(`Uploading ${file.name}: ${progress.toFixed(2)}%`);
            },
            (error) => {
              console.error(`Error uploading ${file.name}:`, error);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                name: file.name,
                path,
                url: downloadURL,
                uploadedAt: new Date().toISOString(),
                uploadedBy: {
                  uid: currentUser.uid,
                  email: currentUser.email,
                  displayName: uploaderName,
                },
                type: getFileType(file.name),
              });
            }
          );
        });
      });

      const uploadedDocuments = await Promise.all(uploadPromises);
      setFileUploading(false);
      return uploadedDocuments;
    } catch (error) {
      console.error("Error uploading files:", error);
      setFileUploading(false);
      setError("Failed to upload files");
      return [];
    }
  };

  const createBoard = async (values, uploaderName) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser)
        throw new Error("You must be logged in to create a board");

      // Now members can be empty, so we handle that case
      const allMemberIds = [...new Set([currentUser.uid, ...values.members])];

      const boardData = {
        ...values,
        status: "To Do",
        createdAt: Timestamp.now(),
        // Only set deadline if noDeadline is false
        deadline: values.noDeadline ? null : Timestamp.fromDate(new Date(values.deadline)),
        members: allMemberIds
          .map((memberId) => {
            const user = users.find((user) => user.id === memberId);
            return user
              ? {
                  id: user.id,
                  name: `${user.firstName} ${user.surname}`.trim(),
                  email: user.email,
                }
              : null;
          })
          .filter(Boolean),
        memberIds: allMemberIds,
        createdBy: currentUser.uid,
        createdByDetails: {
          id: currentUser.uid,
          name: uploaderName,
          email: currentUser.email,
        },
        documents: [],
      };

      const boardRef = await addDoc(collection(db, "boards"), boardData);
      return { boardId: boardRef.id, boardData };
    } catch (error) {
      console.error("Error creating board:", error);
      throw error;
    }
  };

  const handleFormSubmit = async (values, { setSubmitting }) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError("You must be logged in to create a board");
        return;
      }

      const userRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userRef);
      const uploaderName = userDoc.exists()
        ? `${userDoc.data().firstName || ""} ${
            userDoc.data().surname || ""
          }`.trim()
        : "Unknown";

      const { boardId, boardData } = await createBoard(values, uploaderName);

      let uploadedDocuments = [];
      if (files.length > 0) {
        uploadedDocuments = await handleFileUpload(
          files,
          uploaderName,
          boardId
        );
        if (uploadedDocuments.length !== files.length) {
          throw new Error("Some files failed to upload");
        }
      }

      const boardRef = doc(db, "boards", boardId);
      await updateDoc(boardRef, {
        documents: uploadedDocuments,
      });

      // Send notification emails to added members (excluding the creator)
      if (values.members && values.members.length > 0) {
        const memberEmails = values.members
          .map(memberId => {
            const user = users.find(u => u.id === memberId);
            return user ? {
              email: user.email,
              name: `${user.firstName} ${user.surname}`.trim()
            } : null;
          })
          .filter(Boolean);

        const emailResult = await sendNotificationEmails(boardData, uploaderName, memberEmails, boardId);
        
        if (!emailResult.success) {
          console.warn("Email notification warning:", emailResult.message);
          // Don't throw an error here, just log the warning
          // The board was created successfully, email failure shouldn't stop the process
        }
      }

      navigate("../boards");
    } catch (error) {
      console.error("Error:", error);
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to determine file type
  const getFileType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'PDF';
      case 'doc':
      case 'docx':
        return 'Word';
      case 'xls':
      case 'xlsx':
        return 'Excel';
      case 'csv':
        return 'CSV';
      default:
        return 'Other';
    }
  };

  // Helper function to get color for file type
  const getFileColor = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf':
        return theme.palette.mode === 'dark' ? '#ff7961' : '#f44336';
      case 'doc':
      case 'docx':
        return theme.palette.mode === 'dark' ? '#64b5f6' : '#2196f3';
      case 'xls':
      case 'xlsx':
      case 'csv':
        return theme.palette.mode === 'dark' ? '#81c784' : '#4caf50';
      default:
        return theme.palette.mode === 'dark' ? '#a5a5a5' : '#757575';
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexGrow={1}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box m="20px" pb={4}>

        {/* Back + heading */}
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <IconButton size="small" onClick={() => navigate("/boards")} sx={{ color: colors.grey[400] }}>
            <BackIcon fontSize="small" />
          </IconButton>
          <Typography variant="caption" color={colors.grey[400]}>Back to Boards</Typography>
        </Box>
        <Typography variant="h3" fontWeight={800} color={colors.grey[100]} mb={0.5}>
          What are you working on?
        </Typography>
        <Typography variant="body1" color={colors.grey[400]} mb={3}>
          Give your board a name, pick a vibe, and add your team.
        </Typography>
        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
        {sendingEmails && <Alert severity="info" sx={{ mb: 2 }}>Sending invites to your team...</Alert>}

        <Formik onSubmit={handleFormSubmit} initialValues={initialValues} validationSchema={boardSchema}>
          {({ values, errors, touched, handleBlur, handleChange, handleSubmit, setFieldValue, isSubmitting }) => (
            <form onSubmit={handleSubmit}>
              <Box display="flex" gap={3} flexDirection={isNonMobile ? "row" : "column"} alignItems="flex-start">

                {/* ── LEFT: form ── */}
                <Box flex={1} display="flex" flexDirection="column" gap={3}>

                  {/* Board name */}
                  <Paper sx={{ p: 3, borderRadius: 3, bgcolor: colors.primary[400] }}>
                    <Typography variant="subtitle1" fontWeight={700} color={colors.grey[200]} mb={1.5}>
                      Board name
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="e.g. Website redesign, Q2 planning, Sprint 4..."
                      value={values.boardName}
                      name="boardName"
                      onBlur={handleBlur}
                      onChange={handleChange}
                      error={!!touched.boardName && !!errors.boardName}
                      helperText={touched.boardName && errors.boardName}
                      inputProps={{ style: { fontSize: "1.1rem", fontWeight: 600 } }}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="What's this board about? (optional)"
                      value={values.description}
                      name="description"
                      onBlur={handleBlur}
                      onChange={handleChange}
                      sx={{ mt: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  </Paper>

                  {/* Priority cards */}
                  <Paper sx={{ p: 3, borderRadius: 3, bgcolor: colors.primary[400] }}>
                    <Typography variant="subtitle1" fontWeight={700} color={colors.grey[200]} mb={1.5}>
                      How urgent is this?
                    </Typography>
                    <Box display="flex" gap={1.5} flexWrap="wrap">
                      {PRIORITIES.map((p) => {
                        const selected = values.priority === p.value;
                        return (
                          <Box
                            key={p.value}
                            onClick={() => setFieldValue("priority", p.value)}
                            sx={{
                              flex: "1 1 120px",
                              p: 2,
                              borderRadius: 3,
                              cursor: "pointer",
                              border: `2px solid ${selected ? p.color : alpha(p.color, 0.2)}`,
                              bgcolor: selected ? alpha(p.color, 0.12) : alpha(colors.primary[500], 0.5),
                              transition: "all 0.18s ease",
                              "&:hover": { border: `2px solid ${p.color}`, bgcolor: alpha(p.color, 0.08) },
                              transform: selected ? "translateY(-2px)" : "none",
                              boxShadow: selected ? `0 4px 16px ${alpha(p.color, 0.25)}` : "none",
                            }}
                          >
                            <Box sx={{ color: p.color, mb: 0.5 }}>{p.icon}</Box>
                            <Typography variant="body2" fontWeight={700} color={selected ? p.color : colors.grey[300]}>
                              {p.label}
                            </Typography>
                            <Typography variant="caption" color={colors.grey[500]}>{p.desc}</Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </Paper>

                  {/* Members */}
                  <Paper sx={{ p: 3, borderRadius: 3, bgcolor: colors.primary[400] }}>
                    <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                      <MembersIcon sx={{ color: colors.blueAccent[400], fontSize: 20 }} />
                      <Typography variant="subtitle1" fontWeight={700} color={colors.grey[200]}>
                        Who's on this board?
                      </Typography>
                    </Box>
                    <Box display="flex" flexWrap="wrap" gap={1.2}>
                      {users
                        .filter((u) => u.id !== auth.currentUser?.uid)
                        .map((u) => {
                          const name = `${u.firstName || ""} ${u.surname || ""}`.trim();
                          const selected = values.members.includes(u.id);
                          return (
                            <Tooltip key={u.id} title={u.email} placement="top">
                              <Box
                                onClick={() => {
                                  const next = selected
                                    ? values.members.filter((id) => id !== u.id)
                                    : [...values.members, u.id];
                                  setFieldValue("members", next);
                                }}
                                sx={{
                                  display: "flex", alignItems: "center", gap: 1,
                                  px: 1.5, py: 0.8, borderRadius: 10, cursor: "pointer",
                                  border: `2px solid ${selected ? colors.blueAccent[400] : alpha(colors.grey[500], 0.3)}`,
                                  bgcolor: selected ? alpha(colors.blueAccent[500], 0.12) : "transparent",
                                  transition: "all 0.15s",
                                  "&:hover": { border: `2px solid ${colors.blueAccent[400]}` },
                                  transform: selected ? "scale(1.04)" : "none",
                                }}
                              >
                                <Box sx={{ position: "relative" }}>
                                  <Avatar src={u.photoURL || undefined} sx={{ width: 28, height: 28, fontSize: 12, bgcolor: avatarBg(name) }}>
                                    {!u.photoURL && name.charAt(0).toUpperCase()}
                                  </Avatar>
                                  {selected && (
                                    <Box sx={{ position: "absolute", bottom: -2, right: -2, width: 12, height: 12, borderRadius: "50%", bgcolor: colors.blueAccent[400], border: "1.5px solid white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                      <Typography sx={{ fontSize: 8, color: "#fff", lineHeight: 1 }}>✓</Typography>
                                    </Box>
                                  )}
                                </Box>
                                <Typography variant="caption" fontWeight={selected ? 700 : 500} color={selected ? colors.blueAccent[300] : colors.grey[300]}>
                                  {u.firstName}
                                </Typography>
                              </Box>
                            </Tooltip>
                          );
                        })}
                      {users.filter((u) => u.id !== auth.currentUser?.uid).length === 0 && (
                        <Typography variant="body2" color={colors.grey[500]}>No other team members found.</Typography>
                      )}
                    </Box>
                    {values.members.length > 0 && (
                      <Typography variant="caption" color={colors.blueAccent[400]} mt={1} display="block">
                        {values.members.length} person{values.members.length !== 1 ? "s" : ""} invited
                      </Typography>
                    )}
                  </Paper>

                  {/* Deadline */}
                  <Paper sx={{ p: 3, borderRadius: 3, bgcolor: colors.primary[400] }}>
                    <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                      <CalendarIcon sx={{ color: colors.greenAccent[400], fontSize: 20 }} />
                      <Typography variant="subtitle1" fontWeight={700} color={colors.grey[200]}>
                        When's the deadline?
                      </Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={values.noDeadline}
                          onChange={(e) => { setFieldValue("noDeadline", e.target.checked); if (e.target.checked) setFieldValue("deadline", null); }}
                          name="noDeadline"
                          sx={{ color: colors.grey[400] }}
                        />
                      }
                      label={<Typography variant="body2" color={colors.grey[400]}>No deadline — we'll wing it</Typography>}
                    />
                    {!values.noDeadline && (
                      <DatePicker
                        label="Pick a date"
                        value={values.deadline}
                        onChange={(d) => setFieldValue("deadline", d)}
                        minDate={new Date()}
                        slotProps={{
                          textField: {
                            fullWidth: true, size: "small",
                            error: !!touched.deadline && !!errors.deadline && !values.noDeadline,
                            helperText: touched.deadline && errors.deadline && !values.noDeadline ? errors.deadline : "",
                            sx: { mt: 1.5 },
                          },
                        }}
                      />
                    )}
                  </Paper>

                  {/* File attachments */}
                  <Paper sx={{ p: 3, borderRadius: 3, bgcolor: colors.primary[400] }}>
                    <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                      <AttachIcon sx={{ color: colors.orangeAccent?.[400] || "#ff9800", fontSize: 20 }} />
                      <Typography variant="subtitle1" fontWeight={700} color={colors.grey[200]}>
                        Attach files  <Typography component="span" variant="caption" color={colors.grey[500]}>(optional)</Typography>
                      </Typography>
                    </Box>

                    <input accept=".pdf,.doc,.docx,.xls,.xlsx,.csv" style={{ display: "none" }} id="file-upload" type="file" multiple
                      onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])} />

                    <label htmlFor="file-upload">
                      <Box
                        sx={{
                          border: `2px dashed ${alpha(colors.grey[500], 0.4)}`,
                          borderRadius: 2, p: 2, textAlign: "center", cursor: "pointer",
                          "&:hover": { border: `2px dashed ${colors.blueAccent[400]}`, bgcolor: alpha(colors.blueAccent[500], 0.05) },
                          transition: "all 0.15s",
                        }}
                      >
                        <AttachIcon sx={{ color: colors.grey[500], mb: 0.5 }} />
                        <Typography variant="body2" color={colors.grey[400]}>
                          {files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""} attached` : "Click to attach PDF, Word, Excel or CSV"}
                        </Typography>
                      </Box>
                    </label>

                    {fileUploading && <CircularProgress size={20} sx={{ mt: 1 }} />}

                    <Box display="flex" flexWrap="wrap" gap={0.8} mt={files.length ? 1.5 : 0}>
                      {files.map((file, idx) => (
                        <Chip
                          key={idx}
                          size="small"
                          label={file.name}
                          onDelete={() => setFiles(files.filter((_, i) => i !== idx))}
                          sx={{ bgcolor: alpha(getFileColor(file.name), 0.18), color: getFileColor(file.name), border: `1px solid ${alpha(getFileColor(file.name), 0.4)}` }}
                        />
                      ))}
                    </Box>
                  </Paper>
                </Box>

                {/* ── RIGHT: live preview ── */}
                {isNonMobile && (
                  <Box sx={{ width: 260, flexShrink: 0, position: "sticky", top: 80 }}>
                    <Typography variant="caption" color={colors.grey[500]} fontWeight={700} textTransform="uppercase" letterSpacing={1} mb={1} display="block">
                      Preview
                    </Typography>
                    <Box
                      sx={{
                        borderRadius: 3, overflow: "hidden",
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(/assets/bg3.jpg)`,
                        backgroundSize: "cover", color: "#fff",
                        animation: "fadeIn 0.3s ease",
                      }}
                    >
                      {/* Priority stripe */}
                      <Box sx={{ height: 4, bgcolor: PRIORITIES.find(p => p.value === values.priority)?.color || "#ff9800" }} />
                      <Box p={2.5}>
                        <Typography variant="h6" fontWeight={700} mb={0.5} sx={{ minHeight: 28 }}>
                          {values.boardName || <span style={{ opacity: 0.4 }}>Board name...</span>}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7, display: "block", mb: 1.5, minHeight: 18 }}>
                          {values.description || <span style={{ opacity: 0.5 }}>Description...</span>}
                        </Typography>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Chip
                            label={values.priority}
                            size="small"
                            sx={{
                              bgcolor: alpha(PRIORITIES.find(p => p.value === values.priority)?.color || "#ff9800", 0.85),
                              color: "#fff", fontSize: "0.6rem", fontWeight: 700, height: 18,
                            }}
                          />
                          <Typography variant="caption" sx={{ opacity: 0.7 }}>
                            {values.deadline ? new Date(values.deadline).toLocaleDateString() : values.noDeadline ? "No deadline" : ""}
                          </Typography>
                        </Box>
                        {values.members.length > 0 && (
                          <Box display="flex" mt={1.5} gap={0.5}>
                            {values.members.slice(0, 5).map((id) => {
                              const u = users.find(u => u.id === id);
                              const name = u ? `${u.firstName || ""}` : "?";
                              return (
                                <Avatar key={id} src={u?.photoURL || undefined} sx={{ width: 24, height: 24, fontSize: 10, bgcolor: avatarBg(name), border: "1.5px solid rgba(255,255,255,0.5)" }}>
                                  {!u?.photoURL && name.charAt(0).toUpperCase()}
                                </Avatar>
                              );
                            })}
                            {values.members.length > 5 && (
                              <Avatar sx={{ width: 24, height: 24, fontSize: 10, bgcolor: "rgba(255,255,255,0.2)" }}>+{values.members.length - 5}</Avatar>
                            )}
                          </Box>
                        )}
                      </Box>
                    </Box>

                    {/* Create button */}
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      disabled={isSubmitting || fileUploading || sendingEmails}
                      startIcon={isSubmitting || sendingEmails ? <CircularProgress size={16} color="inherit" /> : <RocketIcon />}
                      sx={{
                        mt: 2, py: 1.5, borderRadius: 3, fontWeight: 700, fontSize: "1rem",
                        bgcolor: colors.blueAccent[500],
                        "&:hover": { bgcolor: colors.blueAccent[400], transform: "translateY(-1px)" },
                        "&.Mui-disabled": { opacity: 0.6 },
                        transition: "all 0.2s",
                      }}
                    >
                      {sendingEmails ? "Sending invites..." : isSubmitting ? "Creating..." : "Create Board"}
                    </Button>
                  </Box>
                )}

                {/* Mobile: submit button at bottom */}
                {!isNonMobile && (
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={isSubmitting || fileUploading || sendingEmails}
                    startIcon={isSubmitting || sendingEmails ? <CircularProgress size={16} color="inherit" /> : <RocketIcon />}
                    sx={{ py: 1.5, borderRadius: 3, fontWeight: 700, bgcolor: colors.blueAccent[500] }}
                  >
                    {sendingEmails ? "Sending invites..." : isSubmitting ? "Creating..." : "Create Board"}
                  </Button>
                )}
              </Box>
            </form>
          )}
        </Formik>
      </Box>
    </LocalizationProvider>
  );
};

const boardSchema = yup.object().shape({
  boardName: yup.string().required("Board Name is required"),
  description: yup.string().optional(),
  priority: yup.string().required("Priority is required"),
  members: yup.array(),
  deadline: yup.date().nullable().test({
    name: 'deadline-required',
    test: function(value, context) {
      return context.parent.noDeadline || value 
        ? true 
        : this.createError({ message: 'Deadline is required if "No Deadline" is not checked' });
    }
  }),
  noDeadline: yup.boolean(),
  documents: yup.array().test('fileFormat', 'Invalid file format', function(value) {
    if (!value) return true;
    const validFormats = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv'];
    return value.every(file => 
      validFormats.some(format => file.name.toLowerCase().endsWith(format))
    );
  }).optional(),
});

const initialValues = {
  boardName: "",
  description: "",
  priority: "Important",
  members: [],
  deadline: null,
  noDeadline: false,
  documents: [],
};

export default AddBoard;
