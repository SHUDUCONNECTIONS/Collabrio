import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  useTheme,
  Card,
  CardContent,
  Chip,
  alpha,
  Divider,
} from "@mui/material";
import {
  CheckCircleOutline as DoneIcon,
  HourglassEmpty as InProgressIcon,
  ListAlt as ToDoIcon,
} from "@mui/icons-material";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import AnimatedCounter from "../../components/AnimatedCounter";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import UserBoardsChart from "../userBoardsChart";
import { db, auth } from "../../utils/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import WordScrambleGame from "../game";

const Dashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
const [user, setUser] = useState({ firstName: "", surname: "" });
  const [currentUser, loading] = useAuthState(auth);
  const [boardBackgrounds, setBoardBackgrounds] = useState({});

  const backgroundImages = Array.from({ length: 25 }, (_, i) => `/assets/bg${i + 1}.jpg`);

  // Initialize board backgrounds
  useEffect(() => {
    const storedBackgrounds = localStorage.getItem('boardBackgrounds');
    if (storedBackgrounds) {
      setBoardBackgrounds(JSON.parse(storedBackgrounds));
    }
  }, []);

  // Get or create a consistent background for a board
  const getBoardBackground = (boardId) => {
    if (!boardBackgrounds[boardId]) {
      const newBackgrounds = {
        ...boardBackgrounds,
        [boardId]: backgroundImages[Math.floor(Math.random() * backgroundImages.length)]
      };
      setBoardBackgrounds(newBackgrounds);
      localStorage.setItem('boardBackgrounds', JSON.stringify(newBackgrounds));
      return newBackgrounds[boardId];
    }
    return boardBackgrounds[boardId];
  };

  // Fetch users and boards from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Wait for auth to initialize and check if user is logged in
        if (loading) return;
        if (!currentUser?.uid) {
          navigate('/login');
          return;
        }

        // Fetch boards where the current user is a member
        const boardsRef = collection(db, "boards");
        const boardsQuery = query(
          boardsRef,
          where("memberIds", "array-contains", currentUser.uid)
        );
        const boardsSnapshot = await getDocs(boardsQuery);
        const boardsData = boardsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        setBoards(boardsData);

      } catch (err) {
        console.error("Error fetching data:", err);
        // Handle error appropriately
      }
    };

    fetchData();
  }, [currentUser, loading, navigate]);

  // Format timestamp to a readable date
  const formatDate = (deadline) => {
    if (!deadline || deadline === "No deadline") return "No deadline";

    let date;
    try {
      if (typeof deadline === "string") {
        date = new Date(deadline);
      } else if (deadline.toDate) {
        date = deadline.toDate();
      } else {
        return "Invalid deadline";
      }

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid deadline";
    }
  };

  // Truncate long board names
  const truncateBoardName = (name, maxLength = 20) => {
    if (!name) return "Unnamed Board";
    if (name.length > maxLength) {
      return `${name.substring(0, maxLength)}...`;
    }
    return name;
  };

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (loading) return;
        if (!currentUser?.uid) {
          setUser({ firstName: "", surname: "" });
          return;
        }

        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({
            firstName: userData.firstName || "",
            surname: userData.surname || "",
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUser({ firstName: "", surname: "" });
      }
    };

    fetchUserData();
  }, [currentUser, loading]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!currentUser) {
    return null; // or redirect to login
  }

  return (
    <Box m="20px" height="90vh" display="flex" flexDirection="column" overflow="auto">
      {/* HEADER */}
      <Box display="flex" justifyContent="space-between" alignItems="center" className="animate-fade-in">
        <Header
          title="SHUDU CONNECTIONS"
          subtitle={`Welcome back, ${user.firstName} ${user.surname}`}
        />
      </Box>

      {/* QUICK STATS */}
      {boards.length > 0 && (
        <Box display="flex" gap={1.5} mb={2} flexWrap="wrap" className="animate-fade-in">
          {[
            { label: "Total Boards", value: boards.length, icon: <ToDoIcon sx={{ fontSize: 16 }} />, color: colors.blueAccent[400] },
            { label: "In Progress", value: boards.filter(b => (b.status||"").toLowerCase().includes("progress")).length, icon: <InProgressIcon sx={{ fontSize: 16 }} />, color: colors.orangeAccent?.[400] || "#ff9800" },
            { label: "Completed", value: boards.filter(b => (b.status||"").toLowerCase().includes("complet")).length, icon: <DoneIcon sx={{ fontSize: 16 }} />, color: colors.greenAccent[400] },
          ].map((stat, i) => (
            <Box
              key={i}
              sx={{
                display: "flex", alignItems: "center", gap: 1,
                px: 2, py: 1, borderRadius: 3,
                bgcolor: alpha(stat.color, 0.12),
                border: `1px solid ${alpha(stat.color, 0.25)}`,
                animation: `fadeSlideUp 0.4s ease ${i * 0.08}s both`,
              }}
            >
              <Box sx={{ color: stat.color }}>{stat.icon}</Box>
              <AnimatedCounter value={stat.value} variant="h6" sx={{ color: stat.color, lineHeight: 1 }} />
              <Typography variant="caption" color={colors.grey[400]}>{stat.label}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* BOARDS GRID */}
      {boards.length === 0 && (
        <Box p="20px" textAlign="center">
          <Typography color={colors.grey[300]} variant="h6">
            No boards yet — create one to get started.
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate("/newBoard")}>
            Create Board
          </Button>
        </Box>
      )}
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fill, minmax(220px, 1fr))"
        gap="20px"
        p="10px"
      >
        {[...boards]
          .sort((a, b) => {
            const ta = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0);
            const tb = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0);
            return tb - ta;
          })
          .slice(0, 4)
          .map((board, idx) => (
          <Box
            key={board.id}
            display="flex"
            alignItems="center"
            justifyContent="center"
            sx={{
              borderRadius: "8px",
              animation: `fadeSlideUp 0.4s ease ${idx * 0.1}s both`,
              boxShadow: 3,
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: 5,
                cursor: "pointer",
              },
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${getBoardBackground(board.id)})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              color: "white",
            }}
            onClick={() => navigate(`/boards/${board.id}`)}
          >
            <Card sx={{
              width: "100%",
              height: "100%",
              backgroundColor: "transparent",
              boxShadow: "none"
            }}>
              <CardContent>
                <Typography variant="h5" fontWeight="600" color="white" gutterBottom>
                  {truncateBoardName(board.boardName)}
                </Typography>
                <Typography variant="body2" color="rgba(255,255,255,0.8)" mb={1}>
                  Due: {formatDate(board.deadline)}
                </Typography>
                {board.priority && (
                  <Chip
                    label={board.priority}
                    size="small"
                    sx={{
                      bgcolor: board.priority === "Critical" ? "error.main" : board.priority === "Important" ? "warning.main" : "success.main",
                      color: "white",
                      fontSize: "0.65rem",
                      height: 20,
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* CHARTS GRID */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(12, 1fr)"
        gap="20px"
        p="10px"
        sx={{ gridAutoRows: "minmax(140px, auto)" }}
      >
        {/* User Boards Distribution */}
        <Box gridColumn="span 12" gridRow="span 3" backgroundColor={colors.primary[400]}>
          <Box mt="25px" p="0 30px" display="flex" justifyContent="space-between">
            <Typography variant="h5" fontWeight="600" color={colors.grey[100]}>
              User Boards Distribution
            </Typography>
          </Box>
          <Box height="150px" m="-20px 0 0 0">
            <UserBoardsChart />
          </Box>
        </Box>

      </Box>

      {/* WORD SCRAMBLE GAME */}
      <Box p="10px" mt={2}>
        <Divider sx={{ mb: 2, borderColor: colors.primary[400] }} />
        <WordScrambleGame />
      </Box>
    </Box>
  );
};

export default Dashboard;