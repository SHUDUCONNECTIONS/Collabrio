import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  CircularProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Tabs,
  Tab,
  Pagination,
} from "@mui/material";
import {
  Add as AddIcon,
  People as PeopleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import Header from "../../components/Header";
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
  where,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../../utils/firebase";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { useTheme } from "@mui/material/styles";

const backgroundImages = [
  "/assets/bg1.jpg",
  "/assets/bg2.jpg",
  "/assets/bg3.jpg",
  // ... other background images
];

const Boards = () => {
  // All hooks must be called before any conditional returns
  const [boards, setBoards] = useState([]);
  const [filteredBoards, setFilteredBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [editMembersOpen, setEditMembersOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();
  const [currentUser] = useAuthState(auth);
  const [user, loadingAuth, errorAuth] = useAuthState(auth);
  const [editDueDateOpen, setEditDueDateOpen] = useState(false);
  const [selectedDueDate, setSelectedDueDate] = useState("");
  const [boardToEdit, setBoardToEdit] = useState(null);

  // Pagination and Tab state
  const [currentTab, setCurrentTab] = useState(0);
  const [page, setPage] = useState(1);
  const [boardsPerPage] = useState(6);

  const theme = useTheme();

  // Define status tab colors that work well in both light/dark modes
  const tabColors = {
    todo: {
      light: "#3f51b5", // Blue
      dark: "#5c6bc0",
      text: "#ffffff",
    },
    inProgress: {
      light: "#ff9800", // Orange
      dark: "#ffb74d",
      text: "#000000",
    },
    completed: {
      light: "#4caf50", // Green
      dark: "#81c784",
      text: "#ffffff",
    },
  };

  // Function to get current color based on theme mode
  const getTabColor = (status) => {
    const isDark = theme.palette.mode === "dark";
    switch (status) {
      case 0: // To Do
        return {
          backgroundColor: isDark ? tabColors.todo.dark : tabColors.todo.light,
          color: tabColors.todo.text,
        };
      case 1: // In Progress
        return {
          backgroundColor: isDark
            ? tabColors.inProgress.dark
            : tabColors.inProgress.light,
          color: tabColors.inProgress.text,
        };
      case 2: // Completed
        return {
          backgroundColor: isDark
            ? tabColors.completed.dark
            : tabColors.completed.light,
          color: tabColors.completed.text,
        };
      default:
        return {};
    }
  };

  useEffect(() => {
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
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        if (!user) return;

        const boardsRef = collection(db, "boards");
        const boardsQuery = query(
          boardsRef,
          where("memberIds", "array-contains", user.uid),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(boardsQuery);

        const boardsData = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const createdByName = await fetchUserData(data.createdBy);
            return {
              id: doc.id,
              ...data,
              createdByName,
              backgroundImage:
                backgroundImages[
                  Math.floor(Math.random() * backgroundImages.length)
                ],
              createdAt:
                data.createdAt?.toDate()?.toLocaleDateString() || "N/A",
              deadline: formatDeadline(data.deadline),
              members:
                data.members?.map((m) =>
                  typeof m === "string" ? { id: m, name: m } : m
                ) || [],
              // Make sure status has a default value if not present
              status: data.status || "todo",
            };
          })
        );

        setBoards(boardsData);
      } catch (err) {
        console.error("Error fetching boards:", err);
        setError("Failed to fetch boards");
      } finally {
        setLoading(false);
      }
    };

    fetchBoards();
  }, [user]);

  // Filter boards based on selected tab
  useEffect(() => {
    if (boards.length > 0) {
      let filtered;

      switch (currentTab) {
        case 0: // To Do
          filtered = boards.filter(
            (board) => board.status === "todo" || board.status === "To Do"
          );
          break;
        case 1: // In Progress
          filtered = boards.filter(
            (board) =>
              board.status === "inProgress" || board.status === "In Progress"
          );
          break;
        case 2: // Completed
          filtered = boards.filter(
            (board) =>
              board.status === "completed" || board.status === "Completed"
          );
          break;
        default:
          filtered = boards;
      }

      setFilteredBoards(filtered);
      setPage(1); // Reset to first page when changing tabs
    }
  }, [currentTab, boards]);

  // Calculate pagination
  const indexOfLastBoard = page * boardsPerPage;
  const indexOfFirstBoard = indexOfLastBoard - boardsPerPage;
  const currentBoards = filteredBoards.slice(
    indexOfFirstBoard,
    indexOfLastBoard
  );
  const pageCount = Math.ceil(filteredBoards.length / boardsPerPage);

  // Now handle conditional rendering AFTER all hooks
  if (loadingAuth) {
    return <CircularProgress />;
  }

  if (errorAuth) {
    return (
      <Alert severity="error">Authentication Error: {errorAuth.message}</Alert>
    );
  }

  if (!user) {
    return (
      <Box m="20px">
        <Typography variant="h6" color="error">
          Please sign in to view boards
        </Typography>
      </Box>
    );
  }

  const fetchUserData = async (uid) => {
    try {
      const userRef = doc(db, "users", uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const firstName = userDoc.data().firstName || "";
        const surname = userDoc.data().surname || "";
        return `${firstName} ${surname}`.trim();
      }
      return "Unknown";
    } catch (err) {
      console.error("Error fetching user data:", err);
      return "Unknown";
    }
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return "No deadline";
    try {
      if (deadline.toDate) {
        return deadline.toDate().toLocaleDateString();
      }
      if (typeof deadline === "string" && deadline.includes("T")) {
        return deadline.split("T")[0];
      }
      return deadline;
    } catch (error) {
      console.warn("Error formatting deadline:", error);
      return "Invalid deadline";
    }
  };

  const handleAddBoard = () => {
    navigate("/newBoard");
  };

  const handleBoardClick = (boardId) => {
    navigate(`/boards/${boardId}`);
  };

  const handleDeleteClick = (boardId, e) => {
    e.stopPropagation();
    setSelectedBoard(boardId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      if (!currentUser) return;

      const board = boards.find((b) => b.id === selectedBoard);
      if (board.createdBy !== currentUser.uid) {
        throw new Error("Only board admin can delete");
      }

      await deleteDoc(doc(db, "boards", selectedBoard));
      setBoards((prev) => prev.filter((b) => b.id !== selectedBoard));
    } catch (err) {
      setError(err.message);
    }
    setDeleteConfirmOpen(false);
  };

  const handleEditDueDateClick = (board, e) => {
    e.stopPropagation();
    if (board.createdBy !== currentUser?.uid) {
      setError("Only board admin can edit due date");
      return;
    }
    setBoardToEdit(board);
    setSelectedDueDate(
      board.deadlineDate?.toDate?.()?.toISOString()?.split("T")[0] || ""
    );
    setEditDueDateOpen(true);
  };

  const handleDueDateChange = (e) => {
    setSelectedDueDate(e.target.value);
  };

  const confirmEditDueDate = async () => {
    try {
      if (!currentUser || boardToEdit.createdBy !== currentUser.uid) {
        throw new Error("Unauthorized to edit due date");
      }

      const boardRef = doc(db, "boards", boardToEdit.id);
      const newDeadline = Timestamp.fromDate(new Date(selectedDueDate));

      await updateDoc(boardRef, {
        deadline: newDeadline,
      });

      setBoards((prev) =>
        prev.map((board) =>
          board.id === boardToEdit.id
            ? {
                ...board,
                deadline: formatDeadline(newDeadline),
                deadlineDate: newDeadline,
              }
            : board
        )
      );

      setEditDueDateOpen(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  // Centralized error display
  const renderError = () => (
    <Box m="20px">
      <Alert severity="error" onClose={() => setError(null)}>
        {error}
      </Alert>
    </Box>
  );

  // Update member management click handler
  const handleEditMembersClick = (board, e) => {
    e.stopPropagation();
    if (board.createdBy !== currentUser?.uid) {
      setError("Only board admin can manage members");
      return;
    }
    setSelectedBoard(board);
    setEditMembersOpen(true);
  };

  const updateMembers = async () => {
    try {
      if (!user) return;

      const boardRef = doc(db, "boards", selectedBoard.id);

      await updateDoc(boardRef, {
        boardName: selectedBoard.boardName,
        members: selectedBoard.members,
        memberIds: selectedBoard.members.map((m) => m.id),
      });

      setBoards((prev) =>
        prev.map((board) =>
          board.id === selectedBoard.id
            ? {
                ...selectedBoard,
                boardName: selectedBoard.boardName,
                memberIds: selectedBoard.members.map((m) => m.id),
              }
            : board
        )
      );
    } catch (err) {
      setError(err.message);
    }
    setEditMembersOpen(false);
  };

  const removeMember = (memberToRemove) => {
    if (!currentUser || selectedBoard.createdBy !== currentUser.uid) {
      setError("Only board admin can remove members");
      return;
    }
    if (memberToRemove.id === selectedBoard.createdBy) {
      setError("Cannot remove board creator");
      return;
    }
    setSelectedBoard((prev) => ({
      ...prev,
      members: prev.members.filter((member) => member.id !== memberToRemove.id),
    }));
  };

  if (loading) {
    return (
      <Box
        m="20px"
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box m="20px">
      {/* Display error at the top of the component */}
      {error && renderError()}

      {/* New Due Date Edit Dialog */}
      <Dialog open={editDueDateOpen} onClose={() => setEditDueDateOpen(false)}>
        <DialogTitle>Edit Due Date</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="date"
            value={selectedDueDate}
            onChange={handleDueDateChange}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDueDateOpen(false)}>Cancel</Button>
          <Button onClick={confirmEditDueDate} color="secondary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Header and Add Board button */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Header title="BOARDS" subtitle="Manage Your Project Boards" />
        <Button
          onClick={handleAddBoard}
          color="secondary"
          variant="contained"
          startIcon={<AddIcon />}
        >
          Add New Board
        </Button>
      </Box>

      {/* Status Filter Tabs */}
      {/* Status Filter Tabs */}
      <Box sx={{ mb: 3, mt: 2, display: "flex", justifyContent: "center" }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="standard"
          indicatorColor="secondary"
          sx={{
            "& .MuiTabs-flexContainer": {
              gap: 2,
            },
            "& .MuiTabs-indicator": {
              display: "none", // Hide the default indicator
            },
          }}
        >
          <Tab
            label={
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: currentTab === 0 ? "bold" : "medium",
                    fontSize: "0.9rem",
                  }}
                >
                  To Do
                </Typography>
                <Chip
                  label={
                    boards.filter(
                      (b) => b.status === "todo" || b.status === "To Do"
                    ).length
                  }
                  size="small"
                  sx={{
                    ml: 0.5,
                    height: "18px",
                    fontSize: "0.7rem",
                    fontWeight: "bold",
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(0,0,0,0.1)",
                  }}
                />
              </Box>
            }
            sx={{
              backgroundColor:
                currentTab === 0
                  ? theme.palette.mode === "dark"
                    ? tabColors.todo.dark
                    : tabColors.todo.light
                  : "transparent",
              color: currentTab === 0 ? tabColors.todo.text : "inherit",
              borderRadius: "20px",
              minWidth: "100px",
              minHeight: "32px",
              padding: "0px 16px",
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? "rgba(92, 107, 192, 0.7)"
                    : "rgba(63, 81, 181, 0.1)",
              },
            }}
          />
          <Tab
            label={
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: currentTab === 1 ? "bold" : "medium",
                    fontSize: "0.9rem",
                  }}
                >
                  In Progress
                </Typography>
                <Chip
                  label={
                    boards.filter(
                      (b) =>
                        b.status === "inProgress" || b.status === "In Progress"
                    ).length
                  }
                  size="small"
                  sx={{
                    ml: 0.5,
                    height: "18px",
                    fontSize: "0.7rem",
                    fontWeight: "bold",
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(0,0,0,0.1)",
                  }}
                />
              </Box>
            }
            sx={{
              backgroundColor:
                currentTab === 1
                  ? theme.palette.mode === "dark"
                    ? tabColors.inProgress.dark
                    : tabColors.inProgress.light
                  : "transparent",
              color: currentTab === 1 ? tabColors.inProgress.text : "inherit",
              borderRadius: "20px",
              minWidth: "100px",
              minHeight: "32px",
              padding: "0px 16px",
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? "rgba(255, 183, 77, 0.7)"
                    : "rgba(255, 152, 0, 0.1)",
              },
            }}
          />
          <Tab
            label={
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: currentTab === 2 ? "bold" : "medium",
                    fontSize: "0.9rem",
                  }}
                >
                  Completed
                </Typography>
                <Chip
                  label={
                    boards.filter(
                      (b) =>
                        b.status === "completed" || b.status === "Completed"
                    ).length
                  }
                  size="small"
                  sx={{
                    ml: 0.5,
                    height: "18px",
                    fontSize: "0.7rem",
                    fontWeight: "bold",
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(0,0,0,0.1)",
                  }}
                />
              </Box>
            }
            sx={{
              backgroundColor:
                currentTab === 2
                  ? theme.palette.mode === "dark"
                    ? tabColors.completed.dark
                    : tabColors.completed.light
                  : "transparent",
              color: currentTab === 2 ? tabColors.completed.text : "inherit",
              borderRadius: "20px",
              minWidth: "100px",
              minHeight: "32px",
              padding: "0px 16px",
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? "rgba(129, 199, 132, 0.7)"
                    : "rgba(76, 175, 80, 0.1)",
              },
            }}
          />
        </Tabs>
      </Box>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Board</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this board?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editMembersOpen}
        onClose={() => setEditMembersOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Board</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Board Name"
            value={selectedBoard?.boardName || ""}
            onChange={(e) =>
              setSelectedBoard((prev) => ({
                ...prev,
                boardName: e.target.value,
              }))
            }
            sx={{ mb: 3 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="add-members-label" sx={{ color: "white" }}>
              Add Members
            </InputLabel>
            <Select
              labelId="add-members-label"
              label="Add Members"
              multiple
              value={[]}
              onChange={(e) => {
                const selectedUserIds = e.target.value;
                const newMembers = users
                  .filter((user) => selectedUserIds.includes(user.id))
                  .map((user) => ({
                    id: user.id,
                    name: `${user.firstName} ${user.surname}`.trim(),
                  }));
                setSelectedBoard((prev) => ({
                  ...prev,
                  members: [...prev.members, ...newMembers],
                }));
              }}
              onClose={() => {
                // Close the dropdown after selection
              }}
              renderValue={(selected) => selected.join(", ")}
              sx={{
                "& .MuiInputBase-root": {
                  color: "white",
                },
                "& .MuiInputLabel-root": {
                  color: "white",
                },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "white",
                  },
                  "&:hover fieldset": {
                    borderColor: "white",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "white",
                  },
                },
              }}
            >
              {users
                .filter(
                  (user) =>
                    !selectedBoard?.members?.some(
                      (member) => member.id === user.id
                    )
                )
                .map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    <Checkbox
                      checked={selectedBoard?.members?.some(
                        (member) => member.id === user.id
                      )}
                    />
                    <ListItemText
                      primary={`${user.firstName} ${user.surname}`}
                      secondary={user.email}
                    />
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <Box sx={{ maxHeight: 200, overflow: "auto" }}>
            {selectedBoard?.members?.map((member) => (
              <Box
                key={member.id}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  py: 1,
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <Typography>
                  {member.name}
                  {member.id === selectedBoard.createdBy && " (Admin)"}
                </Typography>
                {currentUser?.uid === selectedBoard.createdBy &&
                  member.id !== selectedBoard.createdBy && (
                    <Button color="error" onClick={() => removeMember(member)}>
                      Remove
                    </Button>
                  )}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setEditMembersOpen(false)}
            sx={{ color: "red" }}
          >
            Cancel
          </Button>
          <Button onClick={updateMembers} color="secondary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {currentBoards.length === 0 ? (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          height="50vh"
        >
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No boards found in this category
          </Typography>
          <Typography color="textSecondary" mb={2}>
            Create a new board or switch tabs to see other boards
          </Typography>
          <Button
            onClick={handleAddBoard}
            color="secondary"
            variant="contained"
            startIcon={<AddIcon />}
          >
            Create New Board
          </Button>
        </Box>
      ) : (
        <>
          <Grid container spacing={3} mt={1}>
            {currentBoards.map((board) => (
              <Grid item xs={12} sm={6} md={4} key={board.id}>
                <Card
                  sx={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: 3,
                      cursor: "pointer",
                    },
                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${board.backgroundImage})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    color: "white",
                  }}
                  onClick={() => handleBoardClick(board.id)}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box flex={1} textAlign="center">
                        <Typography
                          variant="h5"
                          component="h2"
                          gutterBottom
                          sx={{
                            color: "white",
                            fontWeight: "bold",
                            fontSize: "1.1rem",
                            textAlign: "center",
                            marginLeft: "36px",
                          }}
                        >
                          {board.boardName}
                        </Typography>
                      </Box>
                      <Box>
                        {board.createdBy === currentUser?.uid && (
                          <>
                            <IconButton
                              onClick={(e) => handleEditMembersClick(board, e)}
                              sx={{ color: "white" }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              onClick={(e) => handleDeleteClick(board.id, e)}
                              sx={{ color: "white" }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "white",
                        fontSize: "0.8rem",
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {board.description && board.description.length > 50
                        ? `${board.description.slice(0, 50)}...`
                        : board.description}
                    </Typography>
                    <Box display="flex" alignItems="center" mb={1}>
                      <PeopleIcon
                        sx={{ fontSize: 20, mr: 1, color: "white" }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          color: "white",
                          fontWeight: "bold",
                          fontSize: "0.9rem",
                        }}
                      >
                        {board.members?.length || 0} members
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "white",
                          fontWeight: "bold",
                          fontSize: "0.9rem",
                        }}
                      >
                        Admin: {board.createdByName || "Unknown"}
                      </Typography>
                    </Box>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      {board.createdBy === currentUser?.uid ? (
                        <Box
                          onClick={(e) => handleEditDueDateClick(board, e)}
                          sx={{ cursor: "pointer" }}
                        >
                          <Chip
                            label={`Due: ${board.deadline}`}
                            size="small"
                            sx={{
                              color: "white",
                              borderColor: "white",
                              fontWeight: "bold",
                              fontSize: "0.9rem",
                              "& .MuiChip-label": { color: "white" },
                            }}
                            variant="outlined"
                          />
                        </Box>
                      ) : (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "white",
                            fontWeight: "bold",
                            fontSize: "0.9rem",
                          }}
                        >
                          Due: {board.deadline}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                  <CardActions
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 16px",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                      }}
                    >
                      Priority:{" "}
                      {board.priority === "High" ? (
                        <span style={{ color: "red" }}>High</span>
                      ) : board.priority === "Medium" ? (
                        <span style={{ color: "yellow" }}>Medium</span>
                      ) : (
                        <span style={{ color: "green" }}>Low</span>
                      )}
                    </Typography>

                    <Typography
                      variant="caption"
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                      }}
                    >
                      Created: {board.createdAt}
                    </Typography>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {pageCount > 1 && (
            <Box
              display="flex"
              justifyContent="center"
              mt={4}
              mb={2}
              sx={{
                "& .MuiPaginationItem-root": {
                  color: "primary.main",
                  fontWeight: "medium",
                  "&.Mui-selected": {
                    backgroundColor: "primary.main",
                    color: theme.palette.mode === "dark" ? "#fff" : "#000",
                    fontWeight: "bold",
                  },
                },
              }}
            >
              <Pagination
                count={pageCount}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default Boards;
