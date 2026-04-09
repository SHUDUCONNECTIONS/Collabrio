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
  const navigate = useNavigate();

  // ✅ FIXED: single auth hook
  const [user, loadingAuth, errorAuth] = useAuthState(auth);
  const currentUser = user;

  const [editDueDateOpen, setEditDueDateOpen] = useState(false);
  const [selectedDueDate, setSelectedDueDate] = useState("");
  const [boardToEdit, setBoardToEdit] = useState(null);

  const [currentTab, setCurrentTab] = useState(0);
  const [page, setPage] = useState(1);
  const [boardsPerPage] = useState(6);

  const theme = useTheme();

  const fetchUserData = async (uid) => {
    try {
      const userRef = doc(db, "users", uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const { firstName = "", surname = "" } = userDoc.data();
        return `${firstName} ${surname}`.trim();
      }
      return "Unknown";
    } catch {
      return "Unknown";
    }
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return "No deadline";
    try {
      if (deadline.toDate) return deadline.toDate().toLocaleDateString();
      if (typeof deadline === "string" && deadline.includes("T"))
        return deadline.split("T")[0];
      return deadline;
    } catch {
      return "Invalid deadline";
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"));
        setUsers(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      } catch {
        setError("Failed to load users");
      }
    };
    fetchUsers();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fetchBoards = async () => {
      try {
        if (!user) return;

        const q = query(
          collection(db, "boards"),
          where("memberIds", "array-contains", user.uid),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        const boardsData = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const createdByName = await fetchUserData(data.createdBy);

            return {
              id: docSnap.id,
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
              status: data.status || "todo",
            };
          })
        );

        setBoards(boardsData);
      } catch {
        setError("Failed to fetch boards");
      } finally {
        setLoading(false);
      }
    };

    fetchBoards();
  }, [user]);

  useEffect(() => {
    let filtered = boards;

    if (currentTab === 0)
      filtered = boards.filter(
        (b) => b.status === "todo" || b.status === "To Do"
      );
    if (currentTab === 1)
      filtered = boards.filter(
        (b) =>
          b.status === "inProgress" || b.status === "In Progress"
      );
    if (currentTab === 2)
      filtered = boards.filter(
        (b) =>
          b.status === "completed" || b.status === "Completed"
      );

    setFilteredBoards(filtered);
    setPage(1);
  }, [currentTab, boards]);

  const indexOfLast = page * boardsPerPage;
  const currentBoards = filteredBoards.slice(
    indexOfLast - boardsPerPage,
    indexOfLast
  );
  const pageCount = Math.ceil(filteredBoards.length / boardsPerPage);

  if (loadingAuth) return <CircularProgress />;

  if (errorAuth)
    return <Alert severity="error">{errorAuth.message}</Alert>;

  if (!user)
    return (
      <Box m="20px">
        <Typography color="error">
          Please sign in to view boards
        </Typography>
      </Box>
    );

  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box m="20px">
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between">
        <Header title="BOARDS" subtitle="Manage Your Boards" />
        <Button
          onClick={() => navigate("/newBoard")}
          variant="contained"
          startIcon={<AddIcon />}
        >
          Add Board
        </Button>
      </Box>

      <Grid container spacing={3} mt={2}>
        {currentBoards.map((board) => (
          <Grid item xs={12} sm={6} md={4} key={board.id}>
            <Card
              onClick={() => navigate(`/boards/${board.id}`)}
              sx={{
                cursor: "pointer",
                backgroundImage: `url(${board.backgroundImage})`,
                backgroundSize: "cover",
                color: "white",
              }}
            >
              <CardContent>
                <Typography variant="h6">
                  {board.boardName}
                </Typography>

                <Typography variant="caption">
                  {board.description}
                </Typography>

                <Box display="flex" alignItems="center" mt={1}>
                  <PeopleIcon sx={{ mr: 1 }} />
                  {board.members.length} members
                </Box>
              </CardContent>

              <CardActions>
                <Typography variant="caption">
                  Due: {board.deadline}
                </Typography>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {pageCount > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={pageCount}
            page={page}
            onChange={(e, val) => setPage(val)}
          />
        </Box>
      )}
    </Box>
  );
};

export default Boards;
