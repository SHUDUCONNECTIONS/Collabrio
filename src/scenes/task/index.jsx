import React, { useState, useEffect, useCallback } from "react";
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
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Chip,
  Divider,
  useTheme,
  alpha,
} from "@mui/material";
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
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

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

  // Update completion percentage when tasks change
  useEffect(() => {
    const percentage = calculateCompletionPercentage();
    updateBoardCompletionPercentage(percentage);
  }, [tasks]);

  // Update board status when tasks change
  useEffect(() => {
    const status = getBoardStatus();
    const updateBoardStatus = async () => {
      try {
        const boardRef = doc(db, "boards", boardId);
        await updateDoc(boardRef, {
          status: status,
        });
      } catch (err) {
        console.error("Error updating board status:", err);
        setError("Failed to update board status");
      }
    };
    updateBoardStatus();
  }, [tasks, getBoardStatus, boardId]);

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

  // Initialize data
  useEffect(() => {
    fetchBoardData();
    const unsubscribe = fetchTasks();
    return () => unsubscribe && unsubscribe();
  }, [boardId, navigate]);

  // Drag and Drop handlers
  const handleDragStart = (e, taskId, sourceColumn) => {
    setDragging({ taskId, sourceColumn });
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, targetColumn) => {
    e.preventDefault();
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
    setIsEditTaskDialogOpen(true);
  };

  const handleAddTaskSubmit = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      if (!["todo", "doing", "onHold", "done"].includes(selectedColumn)) {
        throw new Error("Invalid column selected");
      }

      await addDoc(collection(db, `boards/${boardId}/tasks`), {
        title: newTaskTitle.trim(),
        status: selectedColumn,
        checklist: [],
        members: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setNewTaskTitle("");
      setIsAddTaskDialogOpen(false);
    } catch (err) {
      console.error("Error adding task:", err);
      setError("Failed to add task");
    }
  };

  const handleEditTaskSubmit = async () => {
    if (!newTaskTitle.trim() || !selectedTask) return;
    try {
      const taskRef = doc(db, `boards/${boardId}/tasks/${selectedTask.id}`);
      await updateDoc(taskRef, {
        title: newTaskTitle.trim(),
        updatedAt: new Date(),
      });
      setIsEditTaskDialogOpen(false);
      setNewTaskTitle("");
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
        flex: "0 0 320px",
        mx: 1,
        p: 2,
        borderRadius: 3,
        height: "fit-content",
        maxHeight: "85vh",
        overflowY: "auto",
        background: alpha(theme.palette.background.paper, 0.9),
        border: `2px solid ${alpha(getColumnColor(columnId), 0.3)}`,
        backdropFilter: "blur(10px)",
        "&:hover": {
          boxShadow: theme.palette.mode === "dark" ? 8 : 6,
          transform: "translateY(-2px)",
          transition: "all 0.3s ease",
        },
      }}
      onDragOver={handleDragOver}
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
              "&:hover": {
                boxShadow: theme.palette.mode === "dark" ? 6 : 4,
                transform: "translateY(-1px)",
                transition: "all 0.2s ease",
              },
              "&:active": {
                cursor: "grabbing",
                transform: "rotate(5deg)",
                opacity: 0.8,
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
        minHeight: "100vh",
        background: getBackgroundGradient(),
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header Section */}
      <Paper
        elevation={4}
        sx={{
          p: 3,
          m: 2,
          borderRadius: 3,
          background: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: "blur(10px)",
          border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              textShadow:
                theme.palette.mode === "dark"
                  ? "none"
                  : "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            {board.boardName}
          </Typography>
          <Button
            variant="contained"
            startIcon={<ChevronLeftIcon />}
            onClick={() => navigate("/boards")}
            sx={{
              borderRadius: 3,
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              bgcolor: "primary.main",
              "&:hover": {
                bgcolor: "primary.dark",
              },
            }}
          >
            All Boards
          </Button>
        </Box>

        {/* Description with scroll */}
        <Paper
          sx={{
            p: 2,
            mb: 2,
            maxHeight: "200px",
            overflowY: "auto",
            bgcolor: alpha(theme.palette.background.default, 0.5),
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          }}
        >
          <Typography
            variant="body1"
            sx={{
              whiteSpace: "pre-line",
              lineHeight: 1.6,
              color: "text.primary",
            }}
          >
            {board.description || "Manage project tasks efficiently"}
          </Typography>
        </Paper>

        {/* Progress Section */}
        <Box sx={{ mb: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, color: "text.primary" }}
            >
              Project Progress
            </Typography>
            <Chip
              label={`${calculateCompletionPercentage()}% - ${getBoardStatus()}`}
              sx={{
                bgcolor: theme.palette.success.main,
                color: theme.palette.mode === "dark" ? "#000" : "#fff",
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
          flexGrow: 1,
          overflowX: "auto",
          p: 2,
          display: "flex",
          gap: 2,
          alignItems: "flex-start",
        }}
      >
        {renderColumn("todo", "To Do")}
        {renderColumn("doing", "In Progress")}
        {renderColumn("onHold", "On Hold")}
        {renderColumn("done", "Completed")}
      </Box>

      {/* Team Members Floating Button */}
      <Button
        variant="contained"
        startIcon={<PeopleIcon />}
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          borderRadius: 3,
          textTransform: "none",
          fontWeight: 600,
          px: 3,
          py: 1.5,
          bgcolor: theme.palette.secondary.main,
          boxShadow: 6,
          "&:hover": {
            bgcolor: theme.palette.secondary.dark,
            transform: "translateY(-2px)",
            boxShadow: 8,
          },
        }}
        onClick={(e) => setAnchorEl(e.currentTarget)}
      >
        Team ({board.members?.length || 0})
      </Button>

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
            <Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, color: "text.primary" }}
              >
                {member.name}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {member.email}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>

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
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Task Title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            sx={{
              mt: 2,
              "& .MuiInputLabel-root": { color: "text.secondary" },
              "& .MuiOutlinedInput-root": { color: "text.primary" },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setIsAddTaskDialogOpen(false)}
            sx={{ color: "error.main", textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddTaskSubmit}
            variant="contained"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            Add Task
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
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Task Title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            sx={{
              mt: 2,
              "& .MuiInputLabel-root": { color: "text.secondary" },
              "& .MuiOutlinedInput-root": { color: "text.primary" },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setIsEditTaskDialogOpen(false)}
            sx={{ color: "error.main", textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditTaskSubmit}
            variant="contained"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Task;
