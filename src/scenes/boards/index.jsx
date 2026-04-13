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
];

const Boards = () => {
  const [boards, setBoards] = useState([]);
  const [filteredBoards, setFilteredBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState(null);

  const [editMembersOpen, setEditMembersOpen] = useState(false);
  const [users, setUsers] = useState([]);

  const [editDueDateOpen, setEditDueDateOpen] = useState(false);
  const [selectedDueDate, setSelectedDueDate] = useState("");
  const [boardToEdit, setBoardToEdit] = useState(null);

  const [currentTab, setCurrentTab] = useState(0);

  const navigate = useNavigate();
  const [user, loadingAuth, errorAuth] = useAuthState(auth);
  const theme = useTheme();

  const tabColors = {
    todo: { light: "#3f51b5", dark: "#5c6bc0", text: "#fff" },
    inprogress: { light: "#ff9800", dark: "#ffb74d", text: "#000" },
    completed: { light: "#4caf50", dark: "#81c784", text: "#fff" },
  };

  const normalizeStatus = (status) =>
    (status || "todo").toLowerCase().replace(" ", "");

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
      setUsers(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
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

  // Filter boards
  useEffect(() => {
    const map = ["todo", "inprogress", "completed"];
    setFilteredBoards(
      boards.filter((b) => b.status === map[currentTab])
    );
  }, [boards, currentTab]);

  if (loadingAuth || loading) return <CircularProgress />;
  if (errorAuth) return <Alert severity="error">{errorAuth.message}</Alert>;
  if (!user) return <Typography>Please sign in</Typography>;

  const handleDelete = async () => {
    await deleteDoc(doc(db, "boards", selectedBoard));
    setBoards((prev) => prev.filter((b) => b.id !== selectedBoard));
    setDeleteConfirmOpen(false);
  };

  const updateMembers = async () => {
    const ref = doc(db, "boards", selectedBoard.id);

    const uniqueMembers = selectedBoard.members.filter(
      (m, i, arr) => arr.findIndex((x) => x.id === m.id) === i
    );

    await updateDoc(ref, {
      members: uniqueMembers,
      memberIds: uniqueMembers.map((m) => m.id),
    });

    setBoards((prev) =>
      prev.map((b) =>
        b.id === selectedBoard.id ? { ...b, members: uniqueMembers } : b
      )
    );

    setEditMembersOpen(false);
  };

  return (
    <Box m="20px">
      {error && <Alert severity="error">{error}</Alert>}

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

      {/* Tabs */}
      <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
        <Tab label="To Do" />
        <Tab label="In Progress" />
        <Tab label="Completed" />
      </Tabs>

      {/* Boards */}
      {filteredBoards.length === 0 ? (
        <Typography mt={4}>No boards found</Typography>
      ) : (
        <Grid container spacing={3} mt={2}>
          {filteredBoards.map((board) => (
            <Grid item xs={12} sm={6} md={4} key={board.id}>
              <Card
                onClick={() => navigate(`/boards/${board.id}`)}
                sx={{
                  cursor: "pointer",
                  backgroundImage: `url(${board.backgroundImage})`,
                  backgroundSize: "cover",
                  color: "#fff",
                }}
              >
                <CardContent>
                  <Typography variant="h6" align="center">
                    {board.boardName}
                  </Typography>

                  <Typography variant="caption">
                    {board.description}
                  </Typography>

                  <Box display="flex" alignItems="center" mt={1}>
                    <PeopleIcon />
                    <Typography ml={1}>
                      {board.members.length} members
                    </Typography>
                  </Box>

                  <Typography mt={1}>
                    Admin: {board.createdByName}
                  </Typography>

                  <Chip label={`Due: ${board.deadline}`} />
                </CardContent>

                <CardActions>
                  <Typography>
                    Priority: {board.priority}
                  </Typography>

                  {board.createdBy === user.uid && (
                    <>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBoard(board);
                          setEditMembersOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>

                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBoard(board.id);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteConfirmOpen}>
        <DialogTitle>Delete?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Members Dialog */}
      <Dialog open={editMembersOpen}>
        <DialogTitle>Edit Members</DialogTitle>
        <DialogContent>
          <FormControl fullWidth>
            <InputLabel>Add Members</InputLabel>
            <Select
              multiple
              value={[]}
              onChange={(e) => {
                const newUsers = users
                  .filter((u) => e.target.value.includes(u.id))
                  .map((u) => ({
                    id: u.id,
                    name: `${u.firstName} ${u.surname}`,
                  }));

                setSelectedBoard((prev) => ({
                  ...prev,
                  members: [...prev.members, ...newUsers],
                }));
              }}
            >
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  <Checkbox />
                  <ListItemText primary={u.firstName} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setEditMembersOpen(false)}>Cancel</Button>
          <Button onClick={updateMembers}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Boards;
