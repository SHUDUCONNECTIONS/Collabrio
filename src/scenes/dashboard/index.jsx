import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  useTheme,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import { useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import UserBoardsChart from "../userBoardsChart";
import { db, auth } from "../../utils/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

const Dashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [boards, setBoards] = useState([]);
  const [userTasks, setUserTasks] = useState([]);
  const [user, setUser] = useState({ firstName: "", surname: "" });
  const [currentUser, loading] = useAuthState(auth);
  const [boardBackgrounds, setBoardBackgrounds] = useState({});

  // Background images array
  const backgroundImages = [
    "/assets/bg1.jpg",
    "/assets/bg2.jpg",
    "/assets/bg3.jpg",
    "/assets/bg4.jpg",
    "/assets/bg5.jpg",
    "/assets/bg7.jpg",
    "/assets/bg8.jpg",
    "/assets/bg9.jpg",
    "/assets/bg10.jpg",
    "/assets/bg11.jpg",
    "/assets/bg12.jpg",
    "/assets/bg13.jpg",
    "/assets/bg14.jpg",
    "/assets/bg15.jpg",
    "/assets/bg16.jpg",
    "/assets/bg17.jpg",
    "/assets/bg18.jpg",
    "/assets/bg19.jpg",
    "/assets/bg20.jpg",
    "/assets/bg21.jpg",
    "/assets/bg22.jpg",
    "/assets/bg23.jpg",
    "/assets/bg24.jpg",
    "/assets/bg25.jpg",
  ];

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

        // Fetch users
        const usersRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersRef);
        const usersData = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersData);

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

        // Group tasks by user
        const groupedTasks = groupTasksByUser(boardsData, usersData);
        setUserTasks(groupedTasks);
      } catch (err) {
        console.error("Error fetching data:", err);
        // Handle error appropriately
      }
    };

    fetchData();
  }, [currentUser, loading, navigate]);

  // Group tasks by user and select the most recent board for each user
  const groupTasksByUser = (boards, users) => {
    if (!Array.isArray(boards) || !Array.isArray(users)) return [];
  
    const grouped = {};
  
    // Initialize users with their boards and deadlines
    boards.forEach((board) => {
      if (!board || !board.createdBy) return;
  
      const user = users.find((user) => user.id === board.createdBy);
      if (user) {
        grouped[user.id] = {
          user: `${user.firstName || "Unknown"} ${user.surname || "User"}`,
          boardName: board.boardName || "Unnamed Board",
          deadline: board.deadline || "No deadline",
        };
      }
    });
  
    // Convert grouped users into an array
    return Object.values(grouped);
  };
  

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
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Header
          title="SHUDU CONNECTIONS"
          subtitle={`Welcome To Reporting Tool: ${user.firstName} ${user.surname}`}
        />
        
      </Box>

      {/* BOARDS GRID */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(12, 1fr)"
        gap="20px"
        p="10px"
        sx={{ gridAutoRows: "minmax(140px, auto)" }}
      >
        {boards.slice(0, 4).map((board) => (
          <Box
            key={board.id}
            gridColumn="span 3"
            display="flex"
            alignItems="center"
            justifyContent="center"
            sx={{
              borderRadius: "8px",
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
                <Typography variant="h5" fontWeight="600" color="white">
                  {truncateBoardName(board.boardName)}
                </Typography>
                <Typography variant="body2" color="white">
                  {formatDate(board.deadline)}
                </Typography>
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
        <Box gridColumn="span 8" gridRow="span 3" backgroundColor={colors.primary[400]}>
          <Box mt="25px" p="0 30px" display="flex" justifyContent="space-between">
            <Typography variant="h5" fontWeight="600" color={colors.grey[100]}>
              User Boards Distribution
            </Typography>
          </Box>
          <Box height="150px" m="-20px 0 0 0">
            <UserBoardsChart />
          </Box>
        </Box>

        {/* Current Tasks */}
        <Box
          gridColumn="span 4"
          gridRow="span 3"
          backgroundColor={colors.primary[400]}
          overflow="auto"
          maxHeight="470px"
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            borderBottom={`4px solid ${colors.primary[500]}`}
            p="15px"
          >
            <Typography color={colors.grey[100]} variant="h5" fontWeight="600">
              Current Tasks
            </Typography>
          </Box>

          {userTasks.map((task, i) => (
            <Grid
              container
              key={`${task.user}-${i}`}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              borderBottom={`4px solid ${colors.primary[500]}`}
              p="15px"
            >
              <Grid item xs={4} display="flex" justifyContent="center">
                <Typography color={colors.greenAccent[500]} variant="h5" fontWeight="600">
                  {task.user}
                </Typography>
              </Grid>

              <Grid item xs={4} display="flex" justifyContent="center">
                <Typography color={colors.grey[100]}>{formatDate(task.deadline)}</Typography>
              </Grid>

              <Grid item xs={4} display="flex" justifyContent="center">
                <Typography
                  sx={{
                    backgroundColor: colors.greenAccent[500],
                    p: "5px 10px",
                    borderRadius: "4px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "150px",
                  }}
                >
                  {truncateBoardName(task.boardName)}
                </Typography>
              </Grid>
            </Grid>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;