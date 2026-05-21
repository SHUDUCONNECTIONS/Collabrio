import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Tabs,
  Tab,
  LinearProgress,
  useTheme,
  alpha,
  Tooltip,
  TextField,
  Grid,
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
} from "firebase/firestore";
import { db, auth } from "../../utils/firebase";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";

const backgroundImages = Array.from({ length: 25 }, (_, i) => `/assets/bg${i + 1}.jpg`);

const priorityColor = (p) =>
  p === "Critical" ? "#ef5350" : p === "Important" ? "#ff9800" : "#4caf50";

const Boards = () => {
  const theme = useTheme();
  const [boards, setBoards] = useState([]);
  const [filteredBoards, setFilteredBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState(null);

  const [editBoardOpen, setEditBoardOpen] = useState(false);
  const [editBoardName, setEditBoardName] = useState("");
  const [editBoardDescription, setEditBoardDescription] = useState("");
  const [editBoardSaving, setEditBoardSaving] = useState(false);
  const [users, setUsers] = useState([]);

  const [currentTab, setCurrentTab] = useState(0);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [user, loadingAuth, errorAuth] = useAuthState(auth);

  const normalizeStatus = (status) =>
    (status || "todo").toLowerCase().replace(/\s/g, "");

  const formatDeadline = (deadline) => {
    if (!deadline) return "No deadline";
    try {
      return deadline.toDate().toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  };

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchUsers();
  }, []);

  // Fetch boards
  useEffect(() => {
    const fetchBoards = async () => {
      if (!user) return;

      try {
        const q = query(
          collection(db, "boards"),
          where("memberIds", "array-contains", user.uid),
          orderBy("createdAt", "desc")
        );

        const snap = await getDocs(q);

        const data = await Promise.all(
          snap.docs.map(async (d) => {
            const b = d.data();

            const userDoc = await getDoc(doc(db, "users", b.createdBy));
            const name = userDoc.exists()
              ? `${userDoc.data().firstName} ${userDoc.data().surname}`
              : "Unknown";

            return {
              id: d.id,
              ...b,
              createdByName: name,
              status: normalizeStatus(b.status),
              backgroundImage:
                backgroundImages[
                  Math.floor(Math.random() * backgroundImages.length)
                ],
              createdAt: b.createdAt?.toDate()?.toLocaleDateString() || "N/A",
              deadline: formatDeadline(b.deadline),
              members: b.members || [],
            };
          })
        );

        setBoards(data);
      } catch (err) {
        setError("Failed to fetch boards");
      } finally {
        setLoading(false);
      }
    };

    fetchBoards();
  }, [user]);

  // Filter boards by tab and search query
  useEffect(() => {
    const map = ["todo", "inprogress", "completed"];
    const q = searchQuery.toLowerCase();
    setFilteredBoards(
      boards.filter((b) => {
        const matchesTab = b.status === map[currentTab];
        if (!q) return matchesTab;
        return matchesTab && (
          b.boardName?.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q) ||
          b.createdByName?.toLowerCase().includes(q)
        );
      })
    );
  }, [boards, currentTab, searchQuery]);

  if (loadingAuth || loading) return <CircularProgress />;
  if (errorAuth) return <Alert severity="error">{errorAuth.message}</Alert>;
  if (!user) return <Typography>Please sign in</Typography>;

  const handleDelete = async () => {
    await deleteDoc(doc(db, "boards", selectedBoard));
    setBoards((prev) => prev.filter((b) => b.id !== selectedBoard));
    setDeleteConfirmOpen(false);
  };

  const updateBoard = async () => {
    if (!editBoardName.trim()) return;
    setEditBoardSaving(true);
    try {
      const boardRef = doc(db, "boards", selectedBoard.id);

      const uniqueMembers = selectedBoard.members.filter(
        (m, i, arr) => arr.findIndex((x) => x.id === m.id) === i
      );

      await updateDoc(boardRef, {
        boardName: editBoardName.trim(),
        description: editBoardDescription.trim(),
        members: uniqueMembers,
        memberIds: uniqueMembers.map((m) => m.id),
      });

      setBoards((prev) =>
        prev.map((b) =>
          b.id === selectedBoard.id
            ? { ...b, boardName: editBoardName.trim(), description: editBoardDescription.trim(), members: uniqueMembers }
            : b
        )
      );
      setEditBoardOpen(false);
    } catch (err) {
      console.error("Error updating board:", err);
    } finally {
      setEditBoardSaving(false);
    }
  };

  return (
    <Box m="20px">
      {error && <Alert severity="error">{error}</Alert>}

      {/* Header */}
      <Box display="flex" justifyContent="space-between">
        <Header title="BOARDS" subtitle="Manage Your Boards" />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/newBoard")}
        >
          Add Board
        </Button>
      </Box>

      {/* Search banner */}
      {searchQuery && (
        <Alert severity="info" sx={{ mb: 1 }}>
          Showing results for <strong>"{searchQuery}"</strong>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
        <Tab label="To Do" />
        <Tab label="In Progress" />
        <Tab label="Completed" />
      </Tabs>

      {/* Boards / Empty State */}
      {filteredBoards.length === 0 ? (
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
            onClick={() => navigate("/newBoard")}
            color="secondary"
            variant="contained"
            startIcon={<AddIcon />}
          >
            Create New Board
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3} mt={2}>
          {filteredBoards.map((board) => (
            <Grid item xs={12} sm={6} md={4} key={board.id}>
              <Card
                onClick={() => navigate(`/boards/${board.id}`)}
                sx={{
                  cursor: "pointer",
                  position: "relative",
                  borderRadius: 3,
                  overflow: "hidden",
                  boxShadow: theme.palette.mode === "dark" ? 4 : 2,
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": { transform: "translateY(-4px)", boxShadow: 8 },
                  backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${board.backgroundImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  color: "#fff",
                }}
              >
                {/* Priority accent bar */}
                <Box sx={{ height: 4, bgcolor: priorityColor(board.priority), width: "100%" }} />

                <CardContent sx={{ pb: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3, flex: 1, mr: 1 }}>
                      {board.boardName}
                    </Typography>
                    <Chip
                      label={board.priority || "—"}
                      size="small"
                      sx={{ bgcolor: alpha(priorityColor(board.priority), 0.85), color: "#fff", fontSize: "0.65rem", height: 20, fontWeight: 700 }}
                    />
                  </Box>

                  <Typography variant="caption" sx={{ opacity: 0.75, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", mt: 0.5 }}>
                    {board.description || "No description"}
                  </Typography>

                  {/* Progress */}
                  {typeof board.completionPercentage === "number" && (
                    <Box mt={1.5}>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>Progress</Typography>
                        <Typography variant="caption" fontWeight={700}>{board.completionPercentage}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={board.completionPercentage}
                        sx={{ borderRadius: 4, height: 5, bgcolor: "rgba(255,255,255,0.2)", "& .MuiLinearProgress-bar": { bgcolor: "#4cceac" } }}
                      />
                    </Box>
                  )}

                  <Box display="flex" alignItems="center" justifyContent="space-between" mt={1.5}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <PeopleIcon sx={{ fontSize: 14, opacity: 0.7 }} />
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>{board.members.length} members</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>Due {board.deadline}</Typography>
                  </Box>
                </CardContent>

                <CardActions sx={{ pt: 0, px: 2, pb: 1.5, justifyContent: "space-between" }}>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>by {board.createdByName}</Typography>
                  {board.createdBy === user.uid && (
                    <Box>
                      <Tooltip title="Edit board">
                        <IconButton
                          size="small"
                          sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "#fff" } }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBoard(board);
                            setEditBoardName(board.boardName || "");
                            setEditBoardDescription(board.description || "");
                            setEditBoardOpen(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete board">
                        <IconButton
                          size="small"
                          sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "#ef5350" } }}
                          onClick={(e) => { e.stopPropagation(); setSelectedBoard(board.id); setDeleteConfirmOpen(true); }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteConfirmOpen}>
        <DialogTitle>Delete Board?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Board Dialog */}
      <Dialog open={editBoardOpen} onClose={() => setEditBoardOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Board</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <TextField
            label="Board Name"
            fullWidth
            value={editBoardName}
            onChange={(e) => setEditBoardName(e.target.value)}
            required
            error={!editBoardName.trim()}
            helperText={!editBoardName.trim() ? "Board name is required" : ""}
          />
          <TextField
            label="Description (optional)"
            fullWidth
            multiline
            rows={3}
            value={editBoardDescription}
            onChange={(e) => setEditBoardDescription(e.target.value)}
          />
          <FormControl fullWidth>
            <InputLabel>Members</InputLabel>
            <Select
              multiple
              value={selectedBoard?.members?.map((m) => m.id) || []}
              label="Members"
              onChange={(e) => {
                const newMembers = users
                  .filter((u) => e.target.value.includes(u.id))
                  .map((u) => ({ id: u.id, name: `${u.firstName} ${u.surname}` }));
                setSelectedBoard((prev) => ({ ...prev, members: newMembers }));
              }}
              renderValue={(selected) =>
                users
                  .filter((u) => selected.includes(u.id))
                  .map((u) => `${u.firstName} ${u.surname}`)
                  .join(", ")
              }
            >
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  <Checkbox checked={selectedBoard?.members?.some((m) => m.id === u.id) || false} />
                  <ListItemText primary={`${u.firstName} ${u.surname}`} secondary={u.email} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditBoardOpen(false)} disabled={editBoardSaving}>Cancel</Button>
          <Button
            onClick={updateBoard}
            variant="contained"
            disabled={editBoardSaving || !editBoardName.trim()}
          >
            {editBoardSaving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Boards;
