import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Checkbox,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Chip,
  useTheme,
  alpha,
  FormControl,
  InputLabel,
  Select,
  Avatar,
  Drawer,
  InputAdornment,
  Tooltip,
  FormControlLabel,
  Snackbar,
  Alert,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  DragHandle,
  Edit as EditIcon,
  Add as AddIcon,
  People as PeopleIcon,
  ChevronLeft as ChevronLeftIcon,
  Delete as DeleteIcon,
  Description as DocumentIcon,
  InsertDriveFile as FileIcon,
  Visibility as VisibilityIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  TaskAlt as TaskAltIcon,
  Schedule as ScheduleIcon,
  PauseCircle as PauseCircleIcon,
  CheckCircle as CheckCircleIcon,
  TableChart as ExcelIcon,
  CalendarToday as CalendarIcon,
  FlagOutlined as FlagIcon,
  Chat as ChatIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  CheckCircle as CheckCircleFilledIcon,
  ErrorOutline as ErrorOutlineIcon,
  Comment as CommentIcon,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";

// Firebase imports
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { auth, db, storage } from "../../utils/firebase";
import PresenceDot from "../../components/PresenceDot";

// Background images array
const backgroundImages = [
  "/assets/bg1.jpg",
  "/assets/bg2.jpg",
  "/assets/bg3.jpg",
];

// Enhanced DocumentManagement Component
const DocumentManagement = ({ documents, onUpload, isUploading, boardId }) => {
  const theme = useTheme();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0 && onUpload) {
      onUpload(files);
    }
  };

  const handleDeleteDocument = async (document) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;

    setIsDeleting(true);
    try {
      // Delete from Firebase Storage
      if (documentToDelete.storagePath) {
        const storageRef = ref(storage, documentToDelete.storagePath);
        await deleteObject(storageRef);
      }

      // Remove from Firestore
      const boardRef = doc(db, "boards", boardId);
      await updateDoc(boardRef, {
        documents: arrayRemove(documentToDelete),
      });

      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    } catch (error) {
      console.error("Error deleting document:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split(".").pop().toLowerCase();
    if (["xlsx", "xls", "csv"].includes(extension)) {
      return <ExcelIcon color="success" />;
    }
    return <FileIcon color="primary" />;
  };

  const getFileTypeLabel = (fileName) => {
    const extension = fileName.split(".").pop().toLowerCase();
    switch (extension) {
      case "xlsx":
      case "xls":
        return "Excel";
      case "csv":
        return "CSV";
      case "pdf":
        return "PDF";
      case "doc":
      case "docx":
        return "Word";
      case "txt":
        return "Text";
      case "fig":
        return "Figma";
      case "sketch":
        return "Sketch";
      default:
        return extension.toUpperCase();
    }
  };

  return (
    <Box sx={{ mt: 2, width: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <DocumentIcon sx={{ color: "primary.main" }} />
        <Typography
          variant="h6"
          sx={{
            flexGrow: 1,
            color: "text.primary",
            fontWeight: 600,
          }}
        >
          Project Documents
        </Typography>
        <input
          type="file"
          id="document-upload"
          hidden
          multiple
          onChange={handleFileUpload}
          accept=".pdf,.doc,.docx,.txt,.fig,.sketch,.xlsx,.xls,.csv"
        />
        <label htmlFor="document-upload">
          <Button
            component="span"
            variant="outlined"
            startIcon={
              isUploading ? <CircularProgress size={16} /> : <CloudUploadIcon />
            }
            disabled={isUploading}
            size="small"
            sx={{
              color: "text.primary",
              borderColor: alpha(theme.palette.primary.main, 0.5),
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: alpha(theme.palette.primary.main, 0.04),
              },
            }}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </label>
      </Box>

      {documents && documents.length > 0 && (
        <Paper
          sx={{
            p: 2,
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
            backdropFilter: "blur(10px)",
          }}
        >
          <List dense>
            {documents.map((doc, index) => (
              <ListItem
                key={index}
                divider={index !== documents.length - 1}
                sx={{
                  "&:hover": {
                    bgcolor: alpha(theme.palette.action.hover, 0.5),
                    borderRadius: 1,
                  },
                }}
              >
                <ListItemIcon>{getFileIcon(doc.name)}</ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        sx={{ color: "text.primary", fontWeight: 500 }}
                      >
                        {doc.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: "primary.main",
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          fontWeight: 600,
                        }}
                      >
                        {getFileTypeLabel(doc.name)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ color: "text.secondary" }}
                      >
                        Uploaded:{" "}
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </Typography>
                      {doc.uploadedBy && (
                        <Typography
                          variant="body2"
                          sx={{ color: "text.secondary", fontStyle: "italic" }}
                        >
                          By: {doc.uploadedBy.name || doc.uploadedBy.email}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <IconButton
                      edge="end"
                      onClick={() =>
                        window.open(
                          `https://docs.google.com/viewer?url=${encodeURIComponent(
                            doc.url
                          )}`,
                          "_blank"
                        )
                      }
                      size="small"
                      sx={{
                        color: "text.secondary",
                        "&:hover": {
                          color: "primary.main",
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                        },
                      }}
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = doc.url;
                        link.download = doc.name;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      size="small"
                      sx={{
                        color: "text.secondary",
                        "&:hover": {
                          color: "primary.main",
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                        },
                      }}
                    >
                      <DownloadIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteDocument(doc)}
                      size="small"
                      sx={{
                        color: "text.secondary",
                        "&:hover": {
                          color: "error.main",
                          bgcolor: alpha(theme.palette.error.main, 0.08),
                        },
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isDeleting && setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: "background.paper",
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, color: "text.primary" }}
          >
            Delete Document
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "text.primary" }}>
            Are you sure you want to delete "{documentToDelete?.name}"? This
            action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isDeleting}
            sx={{ color: "text.secondary", textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteDocument}
            variant="contained"
            color="error"
            disabled={isDeleting}
            startIcon={
              isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />
            }
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const Task = () => {
  const theme = useTheme();
  const { boardId } = useParams();
  const navigate = useNavigate();

  // State management
  const [board, setBoard] = useState(null);
  const [tasks, setTasks] = useState({
    todo: [],
    doing: [],
    onHold: [],
    done: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState(null);
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Medium");
  const [newTaskRequiresDoc, setNewTaskRequiresDoc] = useState(false);
  const [taskDocUploading, setTaskDocUploading] = useState(null); // taskId currently uploading
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [commentTask, setCommentTask] = useState(null);
  const [taskComments, setTaskComments] = useState([]);
  const [taskCommentText, setTaskCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const commentsEndRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [memberPresence, setMemberPresence] = useState({});
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [celebratingTask, setCelebratingTask] = useState(null);
  const [isEditingBoardInfo, setIsEditingBoardInfo] = useState(false);
  const [editBoardName, setEditBoardName] = useState("");
  const [editBoardDescription, setEditBoardDescription] = useState("");
  const [savingBoardInfo, setSavingBoardInfo] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const chatEndRef = useRef(null);
  const [completeBoardOpen, setCompleteBoardOpen] = useState(false);
  const [completingBoard, setCompletingBoard] = useState(false);

  // Update board completion percentage
  const updateBoardCompletionPercentage = async (percentage) => {
    try {
      const boardRef = doc(db, "boards", boardId);
      await updateDoc(boardRef, {
        completionPercentage: percentage,
      });
    } catch (err) {
      console.error("Error updating board completion percentage:", err);
      setError("Failed to update board completion percentage");
    }
  };

  // Calculate completion percentage
  const calculateCompletionPercentage = () => {
    const totalTasks = Object.values(tasks).flat().length;
    const completedTasks = tasks.done.length;
    if (totalTasks === 0) return 0;
    return Math.round((completedTasks / totalTasks) * 100);
  };

  // Get board status
  const getBoardStatus = useCallback(() => {
    const totalTasks = Object.values(tasks).flat().length;
    if (
      tasks.doing.length > 0 ||
      (tasks.done.length > 0 && totalTasks > tasks.done.length)
    ) {
      return "In Progress";
    } else if (totalTasks > 0 && tasks.done.length === totalTasks) {
      return "Completed";
    } else {
      return "To Do";
    }
  }, [tasks]);

  // Sync board status + completion % whenever tasks change.
  useEffect(() => {
    const totalTasks = Object.values(tasks).flat().length;
    if (totalTasks === 0) return;

    const percentage = calculateCompletionPercentage();
    updateBoardCompletionPercentage(percentage);

    const boardRef = doc(db, "boards", boardId);
    let newStatus;
    if (tasks.done.length === totalTasks) {
      newStatus = "Completed";
    } else if (tasks.doing.length > 0 || tasks.done.length > 0) {
      newStatus = "In Progress";
    } else {
      newStatus = "To Do";
    }
    updateDoc(boardRef, { status: newStatus }).catch(console.error);
  }, [tasks]);

  // Fetch board data
  const fetchBoardData = async () => {
    try {
      const boardRef = doc(db, "boards", boardId);
      const boardSnap = await getDoc(boardRef);

      if (!boardSnap.exists()) {
        throw new Error("Board not found");
      }
      const data = boardSnap.data();
      setBoard({
        id: boardSnap.id,
        ...data,
        backgroundImage:
          backgroundImages[Math.floor(Math.random() * backgroundImages.length)],
        completionPercentage: data.completionPercentage || 0,
      });

      setDocuments(data.documents || []);
    } catch (err) {
      console.error("Error fetching board:", err);
      setError("Failed to load board");
      navigate("/boards");
    }
  };

  // Fetch tasks with real-time updates
  const fetchTasks = () => {
    try {
      const tasksRef = collection(db, `boards/${boardId}/tasks`);
      const unsubscribe = onSnapshot(tasksRef, (snapshot) => {
        const tasksData = {
          todo: [],
          doing: [],
          onHold: [],
          done: [],
        };
        snapshot.docs.forEach((doc) => {
          const task = {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate().toLocaleString(),
            updatedAt: doc.data().updatedAt?.toDate().toLocaleString(),
          };
          if (tasksData[task.status]) {
            tasksData[task.status].push(task);
          } else {
            console.warn(`Invalid task status: ${task.status}`);
          }
        });
        setTasks(tasksData);
        setLoading(false);
      });
      return unsubscribe;
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("Failed to load tasks");
      setLoading(false);
    }
  };

  // Listen for board document changes
  useEffect(() => {
    const unsubscribeBoard = onSnapshot(doc(db, "boards", boardId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setDocuments(data.documents || []);
        setBoard((prev) => ({
          ...prev,
          ...data,
          documents: data.documents || [],
        }));
      }
    });

    return () => unsubscribeBoard();
  }, [boardId]);

  // Enhanced document upload handler
  const handleDocumentUpload = async (files) => {
    setIsUploading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const uploadPromises = files.map(async (file) => {
        const filename = `${Date.now()}_${file.name}`;
        const storagePath = `documents/${boardId}/${filename}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            null,
            (error) => reject(error),
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                name: file.name,
                url: downloadURL,
                storagePath: storagePath, // Store the storage path for deletion
                uploadedAt: new Date().toISOString(),
                uploadedBy: {
                  uid: currentUser.uid,
                  name: currentUser.displayName,
                  email: currentUser.email,
                },
              });
            }
          );
        });
      });

      const uploadedDocs = await Promise.all(uploadPromises);

      const boardRef = doc(db, "boards", boardId);
      await updateDoc(boardRef, {
        documents: arrayUnion(...uploadedDocs),
      });
    } catch (error) {
      console.error("Error uploading documents:", error);
      setError("Failed to upload documents");
    } finally {
      setIsUploading(false);
    }
  };

  // Upload a document directly to a task
  const handleTaskDocUpload = async (task, file) => {
    if (!file) return;
    setTaskDocUploading(task.id);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Not authenticated");

      const filename = `${Date.now()}_${file.name}`;
      const storagePath = `task-docs/${boardId}/${task.id}/${filename}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise((resolve, reject) => {
        uploadTask.on("state_changed", null, reject, async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          const taskRef = doc(db, `boards/${boardId}/tasks`, task.id);
          await updateDoc(taskRef, {
            taskDocuments: arrayUnion({
              name: file.name,
              url,
              storagePath,
              uploadedAt: new Date().toISOString(),
              uploadedBy: currentUser.displayName || currentUser.email,
            }),
          });
          resolve();
        });
      });

      setSnackbar({ open: true, message: "Document uploaded successfully", severity: "success" });
    } catch (err) {
      console.error("Task doc upload error:", err);
      setSnackbar({ open: true, message: "Failed to upload document", severity: "error" });
    } finally {
      setTaskDocUploading(null);
    }
  };

  // Mark a task as complete — validates document requirement first
  const handleMarkComplete = async (task) => {
    if (task.requiresDocument) {
      const hasDoc = task.taskDocuments && task.taskDocuments.length > 0;
      if (!hasDoc) {
        setSnackbar({ open: true, message: "This task requires a document upload before it can be completed.", severity: "warning" });
        return;
      }
    }
    try {
      setCelebratingTask(task.id);
      const taskRef = doc(db, `boards/${boardId}/tasks`, task.id);
      await updateDoc(taskRef, { status: "done", updatedAt: new Date() });
      setSnackbar({ open: true, message: "Task completed!", severity: "success" });
      setTimeout(() => setCelebratingTask(null), 700);
    } catch (err) {
      console.error("Error completing task:", err);
      setCelebratingTask(null);
      setSnackbar({ open: true, message: "Failed to complete task", severity: "error" });
    }
  };

  // Complete the entire board — moves all tasks to done, marks board Completed
  const handleCompleteBoard = async () => {
    setCompletingBoard(true);
    try {
      const allTasks = Object.values(tasks).flat();
      await Promise.all(
        allTasks.map((t) =>
          updateDoc(doc(db, `boards/${boardId}/tasks`, t.id), {
            status: "done",
            updatedAt: new Date(),
          })
        )
      );
      await updateDoc(doc(db, "boards", boardId), {
        status: "Completed",
        completionPercentage: 100,
      });
      setCompleteBoardOpen(false);
      setSnackbar({ open: true, message: "Board marked as complete!", severity: "success" });
    } catch (err) {
      console.error("Error completing board:", err);
      setSnackbar({ open: true, message: "Failed to complete board", severity: "error" });
    } finally {
      setCompletingBoard(false);
    }
  };

  // Initialize data
  useEffect(() => {
    fetchBoardData();
    const unsubscribe = fetchTasks();
    return () => unsubscribe && unsubscribe();
  }, [boardId, navigate]);

  // Subscribe to board comments (real-time chat)
  useEffect(() => {
    const q = collection(db, `boards/${boardId}/comments`);
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const ta = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0);
            const tb = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0);
            return ta - tb;
          });
        setComments(data);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    );
    return () => unsubscribe();
  }, [boardId]);

  const handleSendComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const member = board?.members?.find((m) => m.id === currentUser.uid);
    const name = member?.name || currentUser.displayName || currentUser.email;
    await addDoc(collection(db, `boards/${boardId}/comments`), {
      text,
      authorId: currentUser.uid,
      authorName: name,
      authorInitial: name.charAt(0).toUpperCase(),
      createdAt: new Date(),
    });
    setCommentText("");
  };

  // Subscribe to member presence once the board is loaded
  useEffect(() => {
    if (!board?.memberIds?.length) return;
    const unsubs = board.memberIds.map((uid) =>
      onSnapshot(doc(db, "users", uid), (snap) => {
        if (snap.exists()) {
          setMemberPresence((prev) => ({
            ...prev,
            [uid]: snap.data().online || false,
          }));
        }
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [board?.memberIds?.join(",")]);

  // Task comments — subscribe when a task is selected
  useEffect(() => {
    if (!commentTask) { setTaskComments([]); return; }
    const q = collection(db, `boards/${boardId}/tasks/${commentTask.id}/comments`);
    const unsub = onSnapshot(q, (snap) => {
      const sorted = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0);
          const tb = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0);
          return ta - tb;
        });
      setTaskComments(sorted);
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    });
    return () => unsub();
  }, [commentTask, boardId]);

  const handleSendTaskComment = async () => {
    const text = taskCommentText.trim();
    if (!text || sendingComment) return;
    const user = auth.currentUser;
    if (!user) return;
    const member = board?.members?.find((m) => m.id === user.uid);
    const name = member?.name || user.displayName || user.email;
    setSendingComment(true);
    setTaskCommentText("");
    try {
      await addDoc(collection(db, `boards/${boardId}/tasks/${commentTask.id}/comments`), {
        text,
        authorId: user.uid,
        authorName: name,
        authorInitial: name.charAt(0).toUpperCase(),
        createdAt: new Date(),
      });
      // increment commentCount on the task
      const taskRef = doc(db, `boards/${boardId}/tasks`, commentTask.id);
      await updateDoc(taskRef, { commentCount: (commentTask.commentCount || 0) + 1 });
    } catch (err) {
      console.error("Comment error:", err);
    } finally {
      setSendingComment(false);
    }
  };

  // Board info inline editing
  const startEditingBoardInfo = () => {
    setEditBoardName(board.boardName || "");
    setEditBoardDescription(board.description || "");
    setIsEditingBoardInfo(true);
  };

  const saveBoardInfo = async () => {
    if (!editBoardName.trim()) return;
    setSavingBoardInfo(true);
    try {
      const boardRef = doc(db, "boards", boardId);
      await updateDoc(boardRef, {
        boardName: editBoardName.trim(),
        description: editBoardDescription.trim(),
      });
      setBoard((prev) => ({
        ...prev,
        boardName: editBoardName.trim(),
        description: editBoardDescription.trim(),
      }));
      setIsEditingBoardInfo(false);
    } catch (err) {
      console.error("Error saving board info:", err);
    } finally {
      setSavingBoardInfo(false);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, taskId, sourceColumn) => {
    setDragging({ taskId, sourceColumn });
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => setDragOverColumn(null);

  const handleDrop = async (e, targetColumn) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!dragging || dragging.sourceColumn === targetColumn) {
      setDragging(null);
      return;
    }

    try {
      const taskRef = doc(db, `boards/${boardId}/tasks/${dragging.taskId}`);

      if (!["todo", "doing", "onHold", "done"].includes(targetColumn)) {
        throw new Error("Invalid target column");
      }

      await updateDoc(taskRef, {
        status: targetColumn,
        updatedAt: new Date(),
      });

      setTasks((prevTasks) => {
        const updatedTasks = { ...prevTasks };
        const taskIndex = updatedTasks[dragging.sourceColumn].findIndex(
          (task) => task.id === dragging.taskId
        );

        if (taskIndex !== -1) {
          const [task] = updatedTasks[dragging.sourceColumn].splice(
            taskIndex,
            1
          );
          task.status = targetColumn;
          updatedTasks[targetColumn].push(task);
        }

        return updatedTasks;
      });
    } catch (err) {
      console.error("Error updating task status:", err);
      setError("Failed to move task");
    }
    setDragging(null);
  };

  // Task management handlers
  const handleAddTask = (column) => {
    setSelectedColumn(column);
    setIsAddTaskDialogOpen(true);
  };

  const handleEditTask = (task, column) => {
    setSelectedTask(task);
    setSelectedColumn(column);
    setNewTaskTitle(task.title);
    setNewTaskDueDate(task.dueDate ? new Date(task.dueDate) : null);
    setNewTaskAssignee(task.assignedTo?.id || "");
    setNewTaskPriority(task.priority || "Important");
    setNewTaskRequiresDoc(task.requiresDocument || false);
    setIsEditTaskDialogOpen(true);
  };

  const handleAddTaskSubmit = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      if (!["todo", "doing", "onHold", "done"].includes(selectedColumn)) {
        throw new Error("Invalid column selected");
      }

      const assignedMember = board?.members?.find((m) => m.id === newTaskAssignee) || null;

      await addDoc(collection(db, `boards/${boardId}/tasks`), {
        title: newTaskTitle.trim(),
        status: selectedColumn,
        checklist: [],
        members: [],
        priority: newTaskPriority,
        dueDate: newTaskDueDate ? newTaskDueDate.toISOString() : null,
        assignedTo: assignedMember ? { id: assignedMember.id, name: assignedMember.name } : null,
        requiresDocument: newTaskRequiresDoc,
        taskDocuments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setNewTaskTitle("");
      setNewTaskDueDate(null);
      setNewTaskAssignee("");
      setNewTaskPriority("Important");
      setNewTaskRequiresDoc(false);
      setIsAddTaskDialogOpen(false);
    } catch (err) {
      console.error("Error adding task:", err);
      setError("Failed to add task");
    }
  };

  const handleEditTaskSubmit = async () => {
    if (!newTaskTitle.trim() || !selectedTask) return;
    try {
      const assignedMember = board?.members?.find((m) => m.id === newTaskAssignee) || null;
      const taskRef = doc(db, `boards/${boardId}/tasks/${selectedTask.id}`);
      await updateDoc(taskRef, {
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        dueDate: newTaskDueDate ? newTaskDueDate.toISOString() : null,
        assignedTo: assignedMember ? { id: assignedMember.id, name: assignedMember.name } : null,
        requiresDocument: newTaskRequiresDoc,
        updatedAt: new Date(),
      });
      setIsEditTaskDialogOpen(false);
      setNewTaskTitle("");
      setNewTaskDueDate(null);
      setNewTaskAssignee("");
      setNewTaskPriority("Important");
      setNewTaskRequiresDoc(false);
    } catch (err) {
      console.error("Error updating task:", err);
      setError("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const taskRef = doc(db, `boards/${boardId}/tasks/${taskId}`);
      await deleteDoc(taskRef);
    } catch (err) {
      console.error("Error deleting task:", err);
      setError("Failed to delete task");
    }
  };

  const handleToggleChecklistItem = async (task, itemId) => {
    try {
      const taskRef = doc(db, `boards/${boardId}/tasks/${task.id}`);
      const updatedChecklist = task.checklist.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );
      await updateDoc(taskRef, {
        checklist: updatedChecklist,
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error("Error toggling checklist item:", err);
      setError("Failed to update checklist");
    }
  };

  // UI Helper functions
  const getColumnIcon = (columnId) => {
    switch (columnId) {
      case "todo":
        return <ScheduleIcon />;
      case "doing":
        return <TaskAltIcon />;
      case "onHold":
        return <PauseCircleIcon />;
      case "done":
        return <CheckCircleIcon />;
      default:
        return <TaskAltIcon />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Critical": return theme.palette.error.main;
      case "Important": return theme.palette.warning.main;
      case "Minor": return theme.palette.success.main;
      default: return theme.palette.info.main;
    }
  };

  const getColumnColor = (columnId) => {
    const isDark = theme.palette.mode === "dark";

    switch (columnId) {
      case "todo":
        return isDark ? "#64b5f6" : "#1976d2";
      case "doing":
        return isDark ? "#ffb74d" : "#ed6c02";
      case "onHold":
        return isDark ? "#ce93d8" : "#9c27b0";
      case "done":
        return isDark ? "#81c784" : "#2e7d32";
      default:
        return isDark ? "#64b5f6" : "#1976d2";
    }
  };

  const getBackgroundGradient = () => {
    const isDark = theme.palette.mode === "dark";

    if (isDark) {
      return "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #424242 100%)";
    } else {
      return "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 50%, #90caf9 100%)";
    }
  };

  // Render column component
  const renderColumn = (columnId, columnTitle) => (
    <Paper
      elevation={3}
      sx={{
        flex: "0 0 300px",
        mx: 0,
        p: 2,
        borderRadius: 3,
        height: "100%",
        overflowY: "auto",
        background: alpha(theme.palette.background.paper, 0.9),
        border: `2px solid ${dragOverColumn === columnId ? getColumnColor(columnId) : alpha(getColumnColor(columnId), 0.3)}`,
        backdropFilter: "blur(10px)",
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
        boxShadow: dragOverColumn === columnId ? `0 0 0 3px ${alpha(getColumnColor(columnId), 0.25)}` : undefined,
        "&:hover": {
          boxShadow: theme.palette.mode === "dark" ? 8 : 6,
          transform: "translateY(-2px)",
        },
      }}
      onDragOver={(e) => handleDragOver(e, columnId)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, columnId)}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          pb: 1,
          borderBottom: `2px solid ${alpha(getColumnColor(columnId), 0.3)}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {React.cloneElement(getColumnIcon(columnId), {
            sx: { color: getColumnColor(columnId) },
          })}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: getColumnColor(columnId),
            }}
          >
            {columnTitle}
          </Typography>
          <Chip
            label={tasks[columnId].length}
            size="small"
            sx={{
              bgcolor: getColumnColor(columnId),
              color: theme.palette.mode === "dark" ? "#000" : "#fff",
              fontWeight: "bold",
            }}
          />
        </Box>
        <IconButton
          size="small"
          onClick={() => handleAddTask(columnId)}
          sx={{
            bgcolor: alpha(getColumnColor(columnId), 0.1),
            "&:hover": { bgcolor: alpha(getColumnColor(columnId), 0.2) },
          }}
        >
          <AddIcon sx={{ color: getColumnColor(columnId) }} />
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {tasks[columnId].map((task) => (
          <Paper
            key={task.id}
            elevation={2}
            draggable
            onDragStart={(e) => handleDragStart(e, task.id, columnId)}
            sx={{
              p: 2,
              borderRadius: 2,
              cursor: "move",
              background: alpha(theme.palette.background.paper, 0.8),
              border: `1px solid ${alpha(getColumnColor(columnId), 0.2)}`,
              backdropFilter: "blur(5px)",
              opacity: dragging?.taskId === task.id ? 0.45 : 1,
              animation: celebratingTask === task.id ? "completePulse 0.6s ease" : undefined,
              transition: "opacity 0.15s, box-shadow 0.2s, transform 0.2s",
              "&:hover": {
                boxShadow: theme.palette.mode === "dark" ? 6 : 4,
                transform: "translateY(-2px)",
              },
              "&:active": {
                cursor: "grabbing",
                transform: "scale(1.03) rotate(1deg)",
                opacity: 0.85,
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
              <DragHandle
                sx={{
                  color: getColumnColor(columnId),
                  fontSize: 20,
                  mt: 0.25,
                  cursor: "grab",
                }}
              />
              <Box sx={{ flexGrow: 1 }}>
                <Typography
                  variant="body1"
                  sx={{
                    lineHeight: 1.4,
                    fontWeight: 500,
                    color: "text.primary",
                    mb: 1,
                  }}
                >
                  {task.title}
                </Typography>

                {/* Priority / due date / assignee badges */}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
                  {task.priority && (
                    <Chip
                      icon={<FlagIcon sx={{ fontSize: 12 }} />}
                      label={task.priority}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.65rem",
                        bgcolor: alpha(getPriorityColor(task.priority), 0.15),
                        color: getPriorityColor(task.priority),
                        "& .MuiChip-icon": { color: getPriorityColor(task.priority) },
                      }}
                    />
                  )}
                  {task.dueDate && (
                    <Chip
                      icon={<CalendarIcon sx={{ fontSize: 12 }} />}
                      label={new Date(task.dueDate).toLocaleDateString()}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.65rem",
                        bgcolor: alpha(theme.palette.info.main, 0.1),
                        color: "text.secondary",
                      }}
                    />
                  )}
                  {task.assignedTo?.name && (
                    <Chip
                      avatar={<Avatar sx={{ width: 16, height: 16, fontSize: 10 }}>{task.assignedTo.name.charAt(0)}</Avatar>}
                      label={task.assignedTo.name.split(" ")[0]}
                      size="small"
                      sx={{ height: 20, fontSize: "0.65rem" }}
                    />
                  )}
                </Box>

                {/* ── Document requirement row ── */}
                {task.requiresDocument && columnId !== "done" && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                    {task.taskDocuments?.length > 0 ? (
                      <Chip
                        icon={<AttachFileIcon sx={{ fontSize: 12 }} />}
                        label={`${task.taskDocuments.length} doc${task.taskDocuments.length > 1 ? "s" : ""} uploaded`}
                        size="small"
                        sx={{ height: 20, fontSize: "0.65rem", bgcolor: alpha(theme.palette.success.main, 0.15), color: "success.main" }}
                      />
                    ) : (
                      <Tooltip title="Upload a document before marking complete">
                        <Chip
                          icon={<ErrorOutlineIcon sx={{ fontSize: 12 }} />}
                          label="Doc required"
                          size="small"
                          sx={{ height: 20, fontSize: "0.65rem", bgcolor: alpha(theme.palette.warning.main, 0.15), color: "warning.main" }}
                        />
                      </Tooltip>
                    )}
                    {/* Hidden file input */}
                    <input
                      id={`task-doc-${task.id}`}
                      type="file"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleTaskDocUpload(task, f);
                        e.target.value = "";
                      }}
                    />
                    <Tooltip title="Attach a document to this task">
                      <span>
                        <IconButton
                          size="small"
                          component="label"
                          htmlFor={`task-doc-${task.id}`}
                          disabled={taskDocUploading === task.id}
                          sx={{ p: 0.3, color: "text.secondary", "&:hover": { color: "primary.main" } }}
                        >
                          {taskDocUploading === task.id
                            ? <CircularProgress size={12} />
                            : <AttachFileIcon sx={{ fontSize: 14 }} />
                          }
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                )}

                {/* ── Complete / Completed row ── */}
                <Box sx={{ mt: 1 }}>
                  {columnId === "done" ? (
                    <Chip
                      icon={<CheckCircleFilledIcon sx={{ fontSize: 14 }} />}
                      label="Completed"
                      size="small"
                      sx={{ height: 22, fontSize: "0.7rem", bgcolor: alpha(theme.palette.success.main, 0.15), color: "success.main", fontWeight: 700 }}
                    />
                  ) : (
                    <Tooltip
                      title={
                        task.requiresDocument && !task.taskDocuments?.length
                          ? "Upload a document to this task before marking it as done"
                          : "Mark as done"
                      }
                    >
                      <span>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<CheckCircleFilledIcon sx={{ fontSize: 14 }} />}
                          onClick={(e) => { e.stopPropagation(); handleMarkComplete(task); }}
                          disabled={task.requiresDocument && !task.taskDocuments?.length}
                          sx={{
                            textTransform: "none",
                            fontSize: "0.7rem",
                            py: 0.3,
                            px: 1,
                            borderRadius: 2,
                            color: "success.main",
                            borderColor: alpha(theme.palette.success.main, 0.5),
                            "&:hover": { bgcolor: alpha(theme.palette.success.main, 0.08), borderColor: "success.main" },
                            "&.Mui-disabled": { opacity: 0.4 },
                          }}
                        >
                          Mark Complete
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                </Box>

                {/* Comments button */}
                <Box sx={{ mt: 0.5 }}>
                  <Tooltip title="View / add comments">
                    <Button
                      size="small"
                      startIcon={<CommentIcon sx={{ fontSize: 13 }} />}
                      onClick={(e) => { e.stopPropagation(); setCommentTask(task); }}
                      sx={{
                        textTransform: "none",
                        fontSize: "0.68rem",
                        py: 0.2,
                        px: 0.8,
                        color: "text.secondary",
                        "&:hover": { color: "primary.main" },
                      }}
                    >
                      {task.commentCount > 0 ? `${task.commentCount} comment${task.commentCount !== 1 ? "s" : ""}` : "Comment"}
                    </Button>
                  </Tooltip>
                </Box>

                {task.checklist && task.checklist.length > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      p: 1,
                      bgcolor: alpha(getColumnColor(columnId), 0.1),
                      borderRadius: 1,
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={task.checklist.every((item) => item.completed)}
                      onChange={() => {
                        const allCompleted = task.checklist.every(
                          (item) => item.completed
                        );
                        task.checklist.forEach((item) => {
                          if (item.completed === allCompleted) {
                            handleToggleChecklistItem(task, item.id);
                          }
                        });
                      }}
                      sx={{
                        p: 0,
                        color: getColumnColor(columnId),
                        "&.Mui-checked": { color: getColumnColor(columnId) },
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      {task.checklist.filter((item) => item.completed).length}/
                      {task.checklist.length} completed
                    </Typography>
                  </Box>
                )}
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditTask(task, columnId);
                  }}
                  sx={{
                    p: 0.5,
                    bgcolor: alpha(theme.palette.action.hover, 0.5),
                    color: "text.secondary",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: "primary.main",
                    },
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTask(task.id);
                  }}
                  sx={{
                    p: 0.5,
                    bgcolor: alpha(theme.palette.action.hover, 0.5),
                    color: "text.secondary",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                      color: "error.main",
                    },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>
    </Paper>
  );

  if (loading) return <CircularProgress sx={{ margin: "auto", mt: 4 }} />;

  if (error || !board)
    return (
      <Box m="20px">
        <Typography color="error" sx={{ mt: 2 }}>
          {error || "Board not found"}
        </Typography>
      </Box>
    );

  return (
    <Box
      sx={{
        height: "100%",
        background: getBackgroundGradient(),
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header Section */}
      <Paper
        elevation={4}
        sx={{
          p: 2,
          m: 1.5,
          borderRadius: 3,
          background: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: "blur(10px)",
          border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1, gap: 2 }}>
          {/* Board name — static or editing */}
          {isEditingBoardInfo ? (
            <TextField
              autoFocus
              value={editBoardName}
              onChange={(e) => setEditBoardName(e.target.value)}
              variant="standard"
              inputProps={{ style: { fontSize: "1.6rem", fontWeight: 700 } }}
              sx={{ flex: 1 }}
              error={!editBoardName.trim()}
              helperText={!editBoardName.trim() ? "Name cannot be empty" : ""}
            />
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  color: "text.primary",
                  textShadow: theme.palette.mode === "dark" ? "none" : "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                {board.boardName}
              </Typography>
              <Tooltip title="Edit board name & description">
                <IconButton size="small" onClick={startEditingBoardInfo} sx={{ opacity: 0.5, "&:hover": { opacity: 1 } }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
            {isEditingBoardInfo && (
              <>
                <Button
                  size="small"
                  onClick={() => setIsEditingBoardInfo(false)}
                  disabled={savingBoardInfo}
                  sx={{ textTransform: "none" }}
                >
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={saveBoardInfo}
                  disabled={savingBoardInfo || !editBoardName.trim()}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  {savingBoardInfo ? "Saving…" : "Save"}
                </Button>
              </>
            )}
            {getBoardStatus() === "Completed" ? (
              <Button
                variant="contained"
                startIcon={<CheckCircleIcon />}
                disabled
                sx={{ borderRadius: 3, textTransform: "none", fontWeight: 700, px: 3, bgcolor: "success.main !important", color: "#fff !important", opacity: "1 !important", cursor: "default" }}
              >
                Completed
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<CheckCircleIcon />}
                onClick={() => setCompleteBoardOpen(true)}
                sx={{ borderRadius: 3, textTransform: "none", fontWeight: 600, px: 3, bgcolor: "success.main", "&:hover": { bgcolor: "success.dark" } }}
              >
                Complete Board
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<ChevronLeftIcon />}
              onClick={() => navigate("/boards")}
              sx={{ borderRadius: 3, textTransform: "none", fontWeight: 600, px: 3, bgcolor: "primary.main", "&:hover": { bgcolor: "primary.dark" } }}
            >
              All Boards
            </Button>
          </Box>
        </Box>

        {/* Description — static or editing */}
        {isEditingBoardInfo ? (
          <TextField
            fullWidth
            multiline
            minRows={1}
            maxRows={3}
            value={editBoardDescription}
            onChange={(e) => setEditBoardDescription(e.target.value)}
            placeholder="Add a description (optional)"
            variant="outlined"
            size="small"
            sx={{ mb: 1 }}
          />
        ) : (
          <Typography
            variant="body2"
            onClick={startEditingBoardInfo}
            sx={{
              mb: 1,
              color: board.description ? "text.secondary" : "text.disabled",
              fontStyle: board.description ? "normal" : "italic",
              cursor: "pointer",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              "&:hover": { color: "text.primary" },
            }}
          >
            {board.description || "Click to add a description…"}
          </Typography>
        )}

        {/* Progress Section */}
        <Box sx={{ mb: 1 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 0.5,
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "text.secondary" }}
            >
              Progress
            </Typography>
            <Chip
              label={`${calculateCompletionPercentage()}% — ${getBoardStatus()}`}
              sx={{
                bgcolor:
                  getBoardStatus() === "Completed"
                    ? theme.palette.success.main
                    : getBoardStatus() === "In Progress"
                    ? theme.palette.warning.main
                    : theme.palette.info.main,
                color: "#fff",
                fontWeight: "bold",
              }}
            />
          </Box>
          <Box
            sx={{
              height: 12,
              bgcolor: alpha(theme.palette.action.disabled, 0.2),
              borderRadius: 6,
              overflow: "hidden",
              border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
            }}
          >
            <Box
              sx={{
                width: `${calculateCompletionPercentage()}%`,
                height: "100%",
                bgcolor: theme.palette.success.main,
                borderRadius: 6,
                transition: "width 0.3s ease",
              }}
            />
          </Box>
        </Box>

        {/* Document Management */}
        <DocumentManagement
          documents={documents}
          onUpload={handleDocumentUpload}
          isUploading={isUploading}
          boardId={boardId} // Add this prop
        />
      </Paper>

      {/* Task Columns */}
      <Box
        sx={{
          flex: 1,
          overflowX: "auto",
          overflowY: "hidden",
          p: 1.5,
          display: "flex",
          gap: 2,
          alignItems: "stretch",
          minHeight: 0,
        }}
      >
        {renderColumn("todo", "To Do")}
        {renderColumn("doing", "In Progress")}
        {renderColumn("onHold", "On Hold")}
        {renderColumn("done", "Completed")}
      </Box>

      {/* Floating action buttons */}
      <Box sx={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Button
          variant="contained"
          startIcon={<ChatIcon />}
          sx={{
            borderRadius: 3,
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            py: 1.5,
            bgcolor: theme.palette.info.main,
            boxShadow: 6,
            "&:hover": { bgcolor: theme.palette.info.dark, transform: "translateY(-2px)", boxShadow: 8 },
          }}
          onClick={() => setChatOpen(true)}
        >
          Chat ({comments.length})
        </Button>
        <Button
          variant="contained"
          startIcon={<PeopleIcon />}
          sx={{
            borderRadius: 3,
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            py: 1.5,
            bgcolor: theme.palette.secondary.main,
            boxShadow: 6,
            "&:hover": { bgcolor: theme.palette.secondary.dark, transform: "translateY(-2px)", boxShadow: 8 },
          }}
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          Team ({board.members?.length || 0})
        </Button>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            mt: 1,
            minWidth: 200,
            bgcolor: "background.paper",
            border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          },
        }}
      >
        {board.members?.map((member) => (
          <MenuItem key={member.id} sx={{ py: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ position: "relative", display: "inline-flex" }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {member.name?.charAt(0).toUpperCase()}
                </Box>
                <PresenceDot
                  online={memberPresence[member.id] || false}
                  size={10}
                  sx={{ position: "absolute", bottom: -1, right: -1 }}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
                  {member.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {member.email}
                </Typography>
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Menu>

      {/* Chat Drawer */}
      <Drawer
        anchor="right"
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        PaperProps={{
          sx: {
            width: 360,
            display: "flex",
            flexDirection: "column",
            bgcolor: "background.paper",
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}` }}>
          <Typography variant="h6" fontWeight={700}>Board Chat</Typography>
          <Typography variant="caption" color="text.secondary">{board.boardName}</Typography>
        </Box>

        {/* Messages */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
          {comments.length === 0 && (
            <Typography color="text.secondary" variant="body2" textAlign="center" mt={4}>
              No messages yet. Start the conversation!
            </Typography>
          )}
          {comments.map((c) => {
            const isMe = c.authorId === auth.currentUser?.uid;
            const time = c.createdAt?.toDate?.()
              ? c.createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "";
            return (
              <Box
                key={c.id}
                sx={{
                  display: "flex",
                  flexDirection: isMe ? "row-reverse" : "row",
                  alignItems: "flex-end",
                  gap: 1,
                }}
              >
                <Avatar sx={{ width: 28, height: 28, fontSize: 13, bgcolor: isMe ? "primary.main" : "secondary.main" }}>
                  {c.authorInitial}
                </Avatar>
                <Box
                  sx={{
                    maxWidth: "75%",
                    px: 1.5,
                    py: 1,
                    borderRadius: isMe ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    bgcolor: isMe
                      ? alpha(theme.palette.primary.main, 0.15)
                      : alpha(theme.palette.action.hover, 0.8),
                  }}
                >
                  {!isMe && (
                    <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">
                      {c.authorName}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.primary">{c.text}</Typography>
                  <Typography variant="caption" color="text.disabled" display="block" textAlign={isMe ? "right" : "left"}>
                    {time}
                  </Typography>
                </Box>
              </Box>
            );
          })}
          <div ref={chatEndRef} />
        </Box>

        {/* Input */}
        <Box sx={{ p: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.2)}` }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Type a message…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendComment()}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleSendComment} color="primary" disabled={!commentText.trim()}>
                    <SendIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Drawer>

      {/* Dialogs */}
      <Dialog
        open={isAddTaskDialogOpen}
        onClose={() => setIsAddTaskDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: "background.paper",
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography
            variant="h5"
            sx={{ fontWeight: 600, color: "text.primary" }}
          >
            Add New Task
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Task Title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Priority</InputLabel>
            <Select
              value={newTaskPriority}
              label="Priority"
              onChange={(e) => setNewTaskPriority(e.target.value)}
            >
              <MenuItem value="Critical">Critical</MenuItem>
              <MenuItem value="Important">Important</MenuItem>
              <MenuItem value="Minor">Minor</MenuItem>
            </Select>
          </FormControl>
          <DatePicker
            label="Due Date (optional)"
            value={newTaskDueDate}
            onChange={(d) => setNewTaskDueDate(d)}
            slotProps={{ textField: { fullWidth: true, size: "small" } }}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Assign To</InputLabel>
            <Select
              value={newTaskAssignee}
              label="Assign To"
              onChange={(e) => setNewTaskAssignee(e.target.value)}
            >
              <MenuItem value=""><em>Unassigned</em></MenuItem>
              {board?.members?.map((m) => (
                <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={newTaskRequiresDoc}
                onChange={(e) => setNewTaskRequiresDoc(e.target.checked)}
                color="warning"
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={600}>Require a document before marking as done</Typography>
                <Typography variant="caption" color="text.secondary">
                  Someone must upload a file to this task before it can be marked as done.
                </Typography>
              </Box>
            }
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setIsAddTaskDialogOpen(false)} sx={{ color: "error.main", textTransform: "none" }}>
            Cancel
          </Button>
          <Button onClick={handleAddTaskSubmit} variant="contained" sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
            Create Task
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isEditTaskDialogOpen}
        onClose={() => setIsEditTaskDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: "background.paper",
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography
            variant="h5"
            sx={{ fontWeight: 600, color: "text.primary" }}
          >
            Edit Task
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Task Title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Priority</InputLabel>
            <Select
              value={newTaskPriority}
              label="Priority"
              onChange={(e) => setNewTaskPriority(e.target.value)}
            >
              <MenuItem value="Critical">Critical</MenuItem>
              <MenuItem value="Important">Important</MenuItem>
              <MenuItem value="Minor">Minor</MenuItem>
            </Select>
          </FormControl>
          <DatePicker
            label="Due Date (optional)"
            value={newTaskDueDate}
            onChange={(d) => setNewTaskDueDate(d)}
            slotProps={{ textField: { fullWidth: true, size: "small" } }}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Assign To</InputLabel>
            <Select
              value={newTaskAssignee}
              label="Assign To"
              onChange={(e) => setNewTaskAssignee(e.target.value)}
            >
              <MenuItem value=""><em>Unassigned</em></MenuItem>
              {board?.members?.map((m) => (
                <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={newTaskRequiresDoc}
                onChange={(e) => setNewTaskRequiresDoc(e.target.checked)}
                color="warning"
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={600}>Require a document before marking as done</Typography>
                <Typography variant="caption" color="text.secondary">
                  Someone must upload a file to this task before it can be marked as done.
                </Typography>
              </Box>
            }
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setIsEditTaskDialogOpen(false)} sx={{ color: "error.main", textTransform: "none" }}>
            Cancel
          </Button>
          <Button onClick={handleEditTaskSubmit} variant="contained" sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Comments Dialog */}
      <Dialog
        open={Boolean(commentTask)}
        onClose={() => { setCommentTask(null); setTaskCommentText(""); }}
        fullWidth maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3, bgcolor: "background.paper", height: "70vh", display: "flex", flexDirection: "column" } }}
      >
        <DialogTitle sx={{ pb: 1, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.15)}` }}>
          <Typography variant="h6" fontWeight={700} color="text.primary">
            {commentTask?.title}
          </Typography>
          <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
            {commentTask?.priority && (
              <Chip label={commentTask.priority} size="small" sx={{ height: 18, fontSize: "0.62rem", bgcolor: alpha(getPriorityColor(commentTask.priority), 0.15), color: getPriorityColor(commentTask.priority) }} />
            )}
            {commentTask?.assignedTo?.name && (
              <Chip label={commentTask.assignedTo.name} size="small" sx={{ height: 18, fontSize: "0.62rem" }} />
            )}
            {commentTask?.dueDate && (
              <Chip label={`Due ${new Date(commentTask.dueDate).toLocaleDateString()}`} size="small" sx={{ height: 18, fontSize: "0.62rem" }} />
            )}
          </Box>
        </DialogTitle>

        {/* Comments list */}
        <DialogContent sx={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1.5, py: 2 }}>
          {taskComments.length === 0 && (
            <Box flex={1} display="flex" alignItems="center" justifyContent="center">
              <Typography color="text.disabled" variant="body2">No comments yet. Be the first to add one.</Typography>
            </Box>
          )}
          {taskComments.map((c) => {
            const isMe = c.authorId === auth.currentUser?.uid;
            const time = c.createdAt?.toDate?.()
              ? c.createdAt.toDate().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
              : "";
            return (
              <Box key={c.id} display="flex" gap={1.5} alignItems="flex-start">
                <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: isMe ? "primary.main" : "secondary.main", flexShrink: 0 }}>
                  {c.authorInitial}
                </Avatar>
                <Box flex={1}>
                  <Box display="flex" alignItems="baseline" gap={1}>
                    <Typography variant="caption" fontWeight={700} color="text.primary">{c.authorName}</Typography>
                    <Typography variant="caption" color="text.disabled">{time}</Typography>
                  </Box>
                  <Paper sx={{ p: 1.2, mt: 0.4, bgcolor: alpha(theme.palette.action.hover, 0.6), borderRadius: 2 }}>
                    <Typography variant="body2" color="text.primary" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {c.text}
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            );
          })}
          <div ref={commentsEndRef} />
        </DialogContent>

        {/* Comment input */}
        <Box sx={{ p: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.15)}`, display: "flex", gap: 1, alignItems: "flex-end" }}>
          <TextField
            fullWidth multiline maxRows={4} size="small"
            placeholder="Write a comment…"
            value={taskCommentText}
            onChange={(e) => setTaskCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendTaskComment(); } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
          <IconButton
            onClick={handleSendTaskComment}
            disabled={!taskCommentText.trim() || sendingComment}
            sx={{ bgcolor: "primary.main", color: "#fff", width: 36, height: 36, "&:hover": { bgcolor: "primary.dark" }, "&.Mui-disabled": { bgcolor: alpha(theme.palette.primary.main, 0.3) } }}
          >
            {sendingComment ? <CircularProgress size={16} color="inherit" /> : <SendIcon sx={{ fontSize: 17 }} />}
          </IconButton>
        </Box>
      </Dialog>

      {/* Complete Board Dialog */}
      {completeBoardOpen && (() => {
        const blockingTasks = Object.values(tasks).flat().filter(
          (t) => t.requiresDocument && (!t.taskDocuments || t.taskDocuments.length === 0)
        );
        const allClear = blockingTasks.length === 0;
        return (
          <Dialog
            open={completeBoardOpen}
            onClose={() => !completingBoard && setCompleteBoardOpen(false)}
            fullWidth
            maxWidth="sm"
            PaperProps={{ sx: { borderRadius: 3 } }}
          >
            <DialogTitle sx={{ fontWeight: 700, fontSize: "1.2rem", pb: 1 }}>
              Complete Board
            </DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
              {allClear ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, py: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.1), border: `1px solid ${alpha(theme.palette.success.main, 0.3)}` }}>
                    <CheckCircleIcon sx={{ color: "success.main", fontSize: 28 }} />
                    <Box>
                      <Typography fontWeight={600} color="success.main">All good — no files required</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Click Continue to mark this board as complete.
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, py: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.1), border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}` }}>
                    <ErrorOutlineIcon sx={{ color: "warning.main" }} />
                    <Typography variant="body2" color="text.secondary">
                      The following tasks require a file upload before the board can be completed.
                    </Typography>
                  </Box>
                  {blockingTasks.map((task) => (
                    <Box
                      key={task.id}
                      sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, p: 1.5, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.3)}`, bgcolor: alpha(theme.palette.background.default, 0.5) }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        {taskDocUploading === task.id
                          ? <CircularProgress size={18} />
                          : task.taskDocuments?.length > 0
                            ? <CheckCircleIcon sx={{ color: "success.main", fontSize: 18 }} />
                            : <AttachFileIcon sx={{ color: "warning.main", fontSize: 18 }} />
                        }
                        <Typography variant="body2" fontWeight={500} noWrap>{task.title}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                        {task.taskDocuments?.length > 0 && (
                          <Typography variant="caption" color="success.main">{task.taskDocuments.length} file{task.taskDocuments.length > 1 ? "s" : ""} uploaded</Typography>
                        )}
                        <input id={`cb-upload-${task.id}`} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleTaskDocUpload(task, f); e.target.value = ""; }} />
                        <label htmlFor={`cb-upload-${task.id}`}>
                          <Button
                            component="span"
                            size="small"
                            variant="outlined"
                            disabled={taskDocUploading === task.id}
                            startIcon={taskDocUploading === task.id ? <CircularProgress size={12} /> : <CloudUploadIcon sx={{ fontSize: 14 }} />}
                            sx={{ textTransform: "none", fontSize: "0.75rem", borderRadius: 2 }}
                          >
                            {task.taskDocuments?.length > 0 ? "Replace" : "Upload"}
                          </Button>
                        </label>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button onClick={() => setCompleteBoardOpen(false)} disabled={completingBoard} sx={{ textTransform: "none", color: "error.main" }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleCompleteBoard}
                disabled={!allClear || completingBoard}
                startIcon={completingBoard ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: "success.main", "&:hover": { bgcolor: "success.dark" }, "&.Mui-disabled": { opacity: 0.45 } }}
              >
                {completingBoard ? "Completing…" : "Continue"}
              </Button>
            </DialogActions>
          </Dialog>
        );
      })()}

      {/* Feedback snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Task;
