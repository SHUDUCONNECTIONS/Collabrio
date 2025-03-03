import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Divider,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Button,
  TextField,
  useMediaQuery,
  alpha,
  useTheme,
} from "@mui/material";
import { Download, ArrowBack, Search } from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers";
import { Link, useParams } from "react-router-dom";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { db } from "../../utils/firebase";
import { collection, onSnapshot, doc, getDoc, getDocs } from "firebase/firestore";
import Header from "../../components/Header";


const EmployeeBoardsPage = () => {
  const { employeeId } = useParams();
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [dateRange, setDateRange] = useState([null, null]);
  const [searchTerm, setSearchTerm] = useState("");
  const [employee, setEmployee] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));


  // Status colors
  const getStatusColor = (status) => {
    const colors = {
      "To Do": theme.palette.info.main,
      "In Progress": "#ff5722",
      "On Hold": theme.palette.warning.main,
      "Completed": theme.palette.success.main,
    };
    return colors[status] || theme.palette.grey[300];
  };


  // Set default dates
  useEffect(() => {
    const timer = setInterval(() => {
      const startDate = startOfMonth(new Date());
      const endDate = new Date();
      setDateRange([startDate, endDate]);
    }, 86400000); // Check daily
 
    return () => clearInterval(timer);
  }, []);


  // Fetch employee details
  useEffect(() => {
    const unsubscribeEmployee = onSnapshot(doc(db, "users", employeeId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setEmployee({
          id: doc.id,
          name: `${data.firstName || ""} ${data.surname || ""}`.trim(),
          email: data.email,
        });
      }
    });
    return () => unsubscribeEmployee();
  }, [employeeId]);


  // Fetch boards
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "boards"), (snapshot) => {
      const boardsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        deadline: doc.data().deadline?.toDate(),
      }));
      setBoards(boardsData.filter((board) => board.memberIds?.includes(employeeId)));
    });
    return () => unsubscribe();
  }, [employeeId]);


  // Filtering logic
  const filteredBoards = boards.filter((board) => {
    const matchesDate =
      !dateRange[0] ||
      !dateRange[1] ||
      (board.createdAt >= dateRange[0] && board.createdAt <= dateRange[1]);
    const matchesSearch = board.boardName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });


  // Fetch tasks for a board
  const fetchTasks = async (boardId) => {
    const tasksRef = collection(db, `boards/${boardId}/tasks`);
    const tasksSnapshot = await getDocs(tasksRef);
    return tasksSnapshot.docs.map((doc) => ({
      title: doc.data().title,
      status: doc.data().status,
    }));
  };


  // Generate report
  const generateDateRangeReport = async () => {
    if (!dateRange[0] || !dateRange[1] || !employee) return;


    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });


    // Add title and employee details
    doc.setFontSize(16);
    doc.text(
      `Employee Boards Report (${format(dateRange[0], "dd MMM yyyy")} - ${format(dateRange[1], "dd MMM yyyy")})`,
      15,
      15
    );


    doc.setFontSize(12);
    doc.text(`Name: ${employee.name || "N/A"}`, 15, 25);
    doc.text(`Email: ${employee.email || "N/A"}`, 15, 32);


    // Fetch tasks for all filtered boards
    const boardsWithTasks = await Promise.all(
      filteredBoards.map(async (board) => {
        const tasks = await fetchTasks(board.id);
        return {
          ...board,
          tasks: tasks,
        };
      })
    );


    // Create table content
    const headers = [
      "Board Name",
      "Created Date",
      "Deadline",
      "Description",
      "Tasks",
      "Status",
      "Team Members",
    ];


    const rows = boardsWithTasks.map((board) => {
      // Group tasks by status
      const tasksByStatus = {
        todo: board.tasks.filter((t) => t.status === "todo").map((t) => t.title),
        doing: board.tasks.filter((t) => t.status === "doing").map((t) => t.title),
        onHold: board.tasks.filter((t) => t.status === "onHold").map((t) => t.title),
        done: board.tasks.filter((t) => t.status === "done").map((t) => t.title),
      };


      // Format tasks as string
      const tasksText = Object.entries(tasksByStatus)
        .filter(([_, tasks]) => tasks.length > 0)
        .map(
          ([status, tasks]) =>
            `${status.toUpperCase()}:\n${tasks.map((t) => "• " + t).join("\n")}`
        )
        .join("\n\n");


      return [
        board.boardName,
        format(board.createdAt, "dd MMM yyyy"),
        format(board.deadline, "dd MMM yyyy"),
        board.description || "",
        tasksText,
        board.status,
        board.members?.map((m) => `${m.name} (${m.email})`).join("; ") || "",
      ];
    });


    // Add table
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 40,
      margin: { top: 40, right: 15, bottom: 15, left: 15 },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        3: { cellWidth: 40 }, // Description
        4: { cellWidth: 60 }, // Tasks
        6: { cellWidth: 40 }, // Team Members
      },
    });


    doc.save(
      `${employee.name}_${format(dateRange[0], "ddMMMyyyy")} - ${format(dateRange[1], "ddMMMyyyy")}_report.pdf`
    );
  };


  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };


  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Header
        title="Employee Boards"
        subtitle={employee ? `Viewing boards for ${employee.name}` : "Loading employee..."}
        leftAction={
          <Button
            component={Link}
            to="/employees"
            startIcon={<ArrowBack sx={{ color: theme.palette.primary.contrastText }} />}
            sx={{
              color: theme.palette.primary.contrastText,
              "&:hover": {
                backgroundColor: alpha(theme.palette.common.white, 0.1),
              },
            }}
          >
            Back to Employees
          </Button>
        }
      />


      {/* Filters Section */}
<Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
  <Grid container spacing={2} alignItems="center">
    {/* Date Pickers */}
    <Grid item xs={12} sm={6} md={3}>
  <DatePicker
    label="Start Date"
    value={dateRange[0]}
    onChange={(newValue) => setDateRange([newValue, dateRange[1]])}
    format="dd/MM/yyyy"
    renderInput={(params) => <TextField {...params} fullWidth />}
  />
</Grid>
<Grid item xs={12} sm={6} md={3}>
  <DatePicker
    label="End Date"
    value={dateRange[1]}
    onChange={(newValue) => setDateRange([dateRange[0], newValue])}
    format="dd/MM/yyyy"
    renderInput={(params) => <TextField {...params} fullWidth />}
  />
</Grid>


    {/* Search */}
    <Grid item xs={12} sm={8} md={4}>
      <TextField
        fullWidth
        label="Search Boards"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: <Search sx={{ mr: 1 }} />,
        }}
      />
    </Grid>


    {/* Report Button */}
    <Grid item xs={12} sm={4} md={2}>
      <Button
        fullWidth
        variant="contained"
        onClick={generateDateRangeReport}
        disabled={!dateRange[0] || !dateRange[1]}
        sx={{
          backgroundColor: theme.palette.success.main,
          color: theme.palette.common.white,
          "&:hover": {
            backgroundColor: theme.palette.success.dark,
          },
          whiteSpace: "nowrap", // Prevent text from wrapping
        }}
      >
        Download Report
      </Button>
    </Grid>
  </Grid>
</Box>
      {/* Boards Grid */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
        <Grid container spacing={3}>
          {filteredBoards.map((board) => (
            <Grid item xs={12} sm={6} md={4} key={board.id}>
              <Link to={`/admin/boards/${board.id}`} state={{ fromEmployee: employeeId }} style={{ textDecoration: "none" }}>
                <Card
                  sx={{
                    height: "100%",
                    borderLeft: `4px solid ${getStatusColor(board.status)}`,
                    bgcolor: alpha(getStatusColor(board.status), 0.1),
                    cursor: "pointer",
                    "&:hover": {
                      boxShadow: theme.shadows[6],
                      transform: "translateY(-2px)",
                      transition: "transform 0.2s, box-shadow 0.2s",
                    },
                  }}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="h6">{board.boardName}</Typography>
                      <IconButton
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAnchorEl(e.currentTarget);
                          setSelectedBoard(board);
                        }}
                      >
                        <Download />
                      </IconButton>
                    </Box>


                    <Divider sx={{ my: 2 }} />


                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Status:</Typography>
                      <Chip
                        label={board.status}
                        size="small"
                        sx={{
                          bgcolor: getStatusColor(board.status),
                          color: theme.palette.getContrastText(getStatusColor(board.status)),
                        }}
                      />
                    </Box>


                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Completion:</Typography>
                      <Typography variant="body2">
                        {board.completionPercentage}%
                      </Typography>
                    </Box>


                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">Deadline:</Typography>
                      <Typography variant="body2">
                        {format(board.deadline, "dd MMM yyyy")}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Link>
            </Grid>
          ))}
        </Grid>
      </Box>


      {/* Download Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={async () => {
            if (!selectedBoard) return;


            // Fetch tasks for the selected board
            const tasks = await fetchTasks(selectedBoard.id);


            // Create a PDF document
            const doc = new jsPDF({
              orientation: "landscape",
              unit: "mm",
              format: "a4",
            });


            // Add title and employee details
            doc.setFontSize(16);
            doc.text(`Board Report: ${selectedBoard.boardName}`, 15, 15);


            doc.setFontSize(12);
            doc.text(`Employee: ${employee?.name || "N/A"}`, 15, 25);
            doc.text(`Email: ${employee?.email || "N/A"}`, 15, 32);


            // Group tasks by status
            const tasksByStatus = {
              todo: tasks.filter((t) => t.status === "todo").map((t) => t.title),
              doing: tasks.filter((t) => t.status === "doing").map((t) => t.title),
              onHold: tasks.filter((t) => t.status === "onHold").map((t) => t.title),
              done: tasks.filter((t) => t.status === "done").map((t) => t.title),
            };


            // Format tasks as string
            const tasksText = Object.entries(tasksByStatus)
              .filter(([_, tasks]) => tasks.length > 0)
              .map(
                ([status, tasks]) =>
                  `${status.toUpperCase()}:\n${tasks.map((t) => "• " + t).join("\n")}`
              )
              .join("\n\n");


            // Create table content
            const headers = [
              "Board Name",
              "Created Date",
              "Deadline",
              "Description",
              "Tasks",
              "Status",
              "Team Members",
            ];


            const rows = [
              [
                selectedBoard.boardName,
                format(selectedBoard.createdAt, "dd MMM yyyy"),
                format(selectedBoard.deadline, "dd MMM yyyy"),
                selectedBoard.description || "N/A", // Description
                tasksText, // Tasks
                selectedBoard.status, // Status
                selectedBoard.members // Team Members
                  ? selectedBoard.members.map((m) => `${m.name} (${m.email})`).join("; ")
                  : "N/A",
              ],
            ];


            // Add table to the PDF
            doc.autoTable({
              head: [headers],
              body: rows,
              startY: 40,
              margin: { top: 40, right: 15, bottom: 15, left: 15 },
              styles: {
                fontSize: 9,
                cellPadding: 3,
              },
              columnStyles: {
                3: { cellWidth: 40 }, // Description column width
                4: { cellWidth: 60 }, // Tasks column width
                6: { cellWidth: 40 }, // Team Members column width
              },
            });


            // Save the PDF
            doc.save(`${selectedBoard.boardName}-report.pdf`);
            setAnchorEl(null);
          }}
        >
          Download as PDF
        </MenuItem>
      </Menu>
    </Box>
  );
};


export default EmployeeBoardsPage;



