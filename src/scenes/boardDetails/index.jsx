import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Button,
  CircularProgress,
  useTheme,
  LinearProgress,
  Paper,
  IconButton,
} from "@mui/material";
import {
  ArrowBack,
  Dashboard,
  CalendarToday,
  Description,
  Person,
  Assignment,
  CheckCircle,
  Timer,
  HourglassEmpty,
  PlayCircleFilled,
} from "@mui/icons-material";
import { db } from "../../utils/firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
} from "firebase/firestore";


const BoardDetailsPage = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [board, setBoard] = useState(null);
  const [tasks, setTasks] = useState({
    todo: [],
    doing: [],
    onHold: [],
    done: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const location = useLocation();
  const employeeId = location.state?.fromEmployee;


  useEffect(() => {
    if (!boardId) return;


    const boardRef = doc(db, "boards", boardId);
    const unsubscribe = onSnapshot(
      boardRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setBoard({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            deadline: data.deadline?.toDate(),
            members: data.members || [],
            completionPercentage: data.completionPercentage || 0,
          });
        } else {
          setError("Board not found");
        }
      },
      (error) => {
        console.error("Error loading board:", error);
        setError("Error loading board details");
      }
    );


    return () => unsubscribe();
  }, [boardId]);


  useEffect(() => {
    if (!boardId) return;


    const tasksRef = collection(db, "boards", boardId, "tasks");
    const tasksQuery = query(tasksRef, orderBy("createdAt", "desc"));


    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const tasksData = {
          todo: [],
          doing: [],
          onHold: [],
          done: [],
        };


        snapshot.forEach((doc) => {
          const taskData = doc.data();
          const task = {
            id: doc.id,
            ...taskData,
            createdAt: taskData.createdAt?.toDate(),
            updatedAt: taskData.updatedAt?.toDate(),
          };


          const status = task.status?.toLowerCase() || "todo";
          const normalizedStatus = status === "onhold" ? "onHold" : status;


          if (tasksData.hasOwnProperty(normalizedStatus)) {
            tasksData[normalizedStatus].push(task);
          } else {
            console.warn(`Invalid task status: ${status}, defaulting to todo`);
            tasksData.todo.push(task);
          }
        });


        setTasks(tasksData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading tasks:", error);
        setError("Failed to load tasks");
        setLoading(false);
      }
    );


    return () => unsubscribe();
  }, [boardId]);


  const handleBack = () => {
    if (employeeId) {
      navigate(`/employeeBoards/${employeeId}`);
    } else {
      navigate("/boards");
    }
  };


  const getStatusIcon = (status) => {
    const icons = {
      todo: <Timer />,
      doing: <PlayCircleFilled />,
      onHold: <HourglassEmpty />,
      done: <CheckCircle />,
    };
    return icons[status] || <Assignment />;
  };


  const getTaskStatusColor = (status) => {
    const colors = {
      todo: theme.palette.info.main,
      doing: theme.palette.warning.main,
      onHold: theme.palette.error.main,
      done: theme.palette.success.main,
    };
    return colors[status] || theme.palette.grey[500];
  };


  const formatDate = (date) => {
    if (!date) return "No date set";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };


  const renderTaskList = (status) => (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2,
        backgroundColor:
          theme.palette.mode === "dark"
            ? "rgba(255, 255, 255, 0.05)"
            : "rgba(0, 0, 0, 0.02)",
      }}
    >
      <Typography
        variant="h6"
        gutterBottom
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        {getStatusIcon(status)}
        {status === "onHold"
          ? "On Hold"
          : status.charAt(0).toUpperCase() + status.slice(1)}{" "}
        Tasks
      </Typography>
      {tasks[status].length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No tasks in this status
        </Typography>
      ) : (
        tasks[status].map((task) => (
          <Card
            key={task.id}
            sx={{ mb: 1, backgroundColor: theme.palette.background.paper }}
          >
            <CardContent sx={{ pb: "8px !important" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Typography variant="body1">{task.title}</Typography>
                <Box>
                  {task.priority && (
                    <Chip
                      label={task.priority}
                      size="small"
                      sx={{
                        ml: 1,
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.08)",
                      }}
                    />
                  )}
                </Box>
              </Box>
              {task.checklist && task.checklist.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Checklist:{" "}
                    {task.checklist.filter((item) => item.completed).length}/
                    {task.checklist.length}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={
                      (task.checklist.filter((item) => item.completed).length /
                        task.checklist.length) *
                      100
                    }
                    sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </Paper>
  );


  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }


   {error && (
    <Box m="20px" textAlign="center">
      <Typography variant="h6" color="error" gutterBottom>
        {error}
      </Typography>
      <Button
        variant="contained"
        startIcon={<ArrowBack />}
        onClick={handleBack}
      >
        Back to Boards
      </Button>
    </Box>
  )}
  if (!board) return null;


  return (
    <Box sx={{
      p: { xs: 2, sm: 3 },
      maxWidth: 1200,
      margin: "0 auto",
      height: '100vh',
      overflowY: 'auto',
    }}>
      <Button
    variant="outlined"
    startIcon={<ArrowBack />}
    onClick={handleBack}
    sx={{
      mb: 3,
      color: theme.palette.mode === "dark" ? "white" : "inherit",
      borderColor: theme.palette.mode === "dark" ? "white" : "inherit",
    }}
  >
    Back to Boards
  </Button>


      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Dashboard
              fontSize="large"
              sx={{
                color:
                  theme.palette.mode === "dark"
                    ? "white"
                    : theme.palette.primary.main,
              }}
            />
            <Typography variant="h4" component="h1">
              {board.boardName}
            </Typography>
          </Box>


          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            <Chip
              label={`Priority: ${board.priority}`}
              sx={{
                color:
                  theme.palette.mode === "dark"
                    ? "white"
                    : theme.palette.primary.main,
                borderColor:
                    theme.palette.mode === "dark"
                      ? "white"
                      : theme.palette.primary.main,
              }}
              variant="outlined"
            />
            <Chip
              label={`Status: ${board.status}`}
              sx={{
                color:
                  theme.palette.mode === "dark"
                    ? "white"
                    : theme.palette.secondary.main,
                borderColor:
                    theme.palette.mode === "dark"
                      ? "white"
                      : theme.palette.secondary.main,
              }}
              variant="outlined"
            />
            <Chip
              label={`Completion: ${board.completionPercentage}%`}
              sx={{
                color:
                  theme.palette.mode === "dark"
                    ? "white"
                    : theme.palette.success.main,
                borderColor:
                    theme.palette.mode === "dark"
                      ? "white"
                      : theme.palette.success.main,
              }}
              variant="outlined"
            />
          </Box>


          <Box mb={4}>
            <Typography variant="h6" gutterBottom>
              Progress
            </Typography>
            <Box sx={{ mb: 2 }}>
              <LinearProgress
                variant="determinate"
                value={board.completionPercentage}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? "rgba(227, 229, 228, 0.1)"
                      : "rgba(160, 156, 160, 0.1)",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "green",
                  },
                }}
              />
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {Object.keys(tasks).map((status) => (
                <Chip
                  key={status}
                  icon={getStatusIcon(status)}
                  label={`${
                    status.charAt(0).toUpperCase() + status.slice(1)
                  } (${tasks[status].length})`}
                  sx={{
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.1)"
                        : "transparent",
                    color:
                      theme.palette.mode === "dark"
                        ? "white"
                        : getTaskStatusColor(status),
                    borderColor: getTaskStatusColor(status),
                  }}
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>


          <Divider sx={{ my: 3 }} />


          <Box mb={4}>
            <Typography variant="h6" gutterBottom>
              <Description sx={{ verticalAlign: "middle", mr: 1 }} />
              Description
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
              {board.description || "No description provided"}
            </Typography>
          </Box>


          <Box mb={4}>
            <Typography variant="h6" gutterBottom>
              <CalendarToday sx={{ verticalAlign: "middle", mr: 1 }} />
              Timeline
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body1">
                  {formatDate(board.createdAt)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Deadline
                </Typography>
                <Typography variant="body1">
                  {formatDate(board.deadline)}
                </Typography>
              </Box>
            </Box>
          </Box>


          <Divider sx={{ my: 3 }} />


          <Box mb={4}>
            <Typography variant="h6" gutterBottom>
              Task Details
            </Typography>
            {Object.keys(tasks).map((status) => renderTaskList(status))}
          </Box>


          <Box>
            <Typography variant="h6" gutterBottom>
              Team Members ({board.members?.length || 0})
            </Typography>
            <List>
              {board.members?.map((member) => (
                <ListItem key={member.id}>
                  <ListItemAvatar>
                    <Avatar>{member.name?.[0] || <Person />}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={member.name}
                    secondary={member.email}
                    primaryTypographyProps={{
                      variant: "subtitle2",
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};


export default BoardDetailsPage;