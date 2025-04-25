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
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { Link, useParams } from "react-router-dom";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { format, parseISO, startOfMonth, endOfMonth, isValid } from "date-fns";
import { db } from "../../utils/firebase";
import { collection, onSnapshot, doc, getDoc, getDocs } from "firebase/firestore";
import Header from "../../components/Header";

// Helper function to safely format dates
const safeFormatDate = (date, formatString) => {
  if (!date) return "No date";
  
  try {
    // Check if date is already a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return "Invalid date";
    }
    
    return format(dateObj, formatString);
  } catch (error) {
    console.error("Date formatting error:", error);
    return "Invalid date";
  }
};

const EmployeeBoardsPage = () => {
  const { employeeId } = useParams();
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [dateRange, setDateRange] = useState([startOfMonth(new Date()), new Date()]);
  const [searchTerm, setSearchTerm] = useState("");
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Status colors
  const getStatusColor = (status) => {
    const colors = {
      "To Do": theme.palette.info.main,
      "In Progress": "#ff5722",
      "On Hold": theme.palette.warning.main,
      "Completed": theme.palette.success.main,
      // Default color for any other status
      "default": theme.palette.grey[500],
    };
    return colors[status] || colors.default;
  };

  // Fetch employee details
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const employeeDoc = await getDoc(doc(db, "users", employeeId));
        if (employeeDoc.exists()) {
          const data = employeeDoc.data();
          setEmployee({
            id: employeeDoc.id,
            name: `${data.firstName || ""} ${data.surname || ""}`.trim(),
            email: data.email || "No email",
          });
        } else {
          console.error("Employee not found");
        }
      } catch (error) {
        console.error("Error fetching employee:", error);
      }
    };

    fetchEmployee();
  }, [employeeId]);

  // Fetch boards
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, "boards"),
      (snapshot) => {
        try {
          const boardsData = snapshot.docs
            .map((doc) => {
              const data = doc.data();
              
              // Safely convert timestamps to dates
              let createdAt = null;
              let deadline = null;
              
              try {
                if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                  createdAt = data.createdAt.toDate();
                }
              } catch (e) {
                console.error("Error converting createdAt:", e);
              }
              
              try {
                if (data.deadline && typeof data.deadline.toDate === 'function') {
                  deadline = data.deadline.toDate();
                }
              } catch (e) {
                console.error("Error converting deadline:", e);
              }
              
              return {
                id: doc.id,
                ...data,
                createdAt: createdAt,
                deadline: deadline,
                boardName: data.boardName || "Untitled Board",
                status: data.status || "No Status",
                completionPercentage: data.completionPercentage || 0,
              };
            })
            .filter((board) => board.memberIds?.includes(employeeId));
          
          setBoards(boardsData);
        } catch (error) {
          console.error("Error processing boards data:", error);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching boards:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [employeeId]);

  // Filtering logic
  const filteredBoards = boards.filter((board) => {
    // Date filter
    const matchesDate =
      !dateRange[0] ||
      !dateRange[1] ||
      !board.createdAt ||
      (board.createdAt >= dateRange[0] && board.createdAt <= dateRange[1]);
      
    // Search filter
    const matchesSearch = 
      !searchTerm || 
      (board.boardName && board.boardName.toLowerCase().includes(searchTerm.toLowerCase()));
      
    return matchesDate && matchesSearch;
  });

  // Fetch tasks for a board
  const fetchTasks = async (boardId) => {
    try {
      const tasksRef = collection(db, `boards/${boardId}/tasks`);
      const tasksSnapshot = await getDocs(tasksRef);
      return tasksSnapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title || "Untitled Task",
        status: doc.data().status || "todo",
      }));
    } catch (error) {
      console.error("Error fetching tasks:", error);
      return [];
    }
  };

  // Generate report
  const generateDateRangeReport = async () => {
    if (!dateRange[0] || !dateRange[1] || !employee) {
      console.error("Missing date range or employee data for report");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // Add title and employee details
      doc.setFontSize(16);
      doc.text(
        `Employee Boards Report (${safeFormatDate(dateRange[0], "dd MMM yyyy")} - ${safeFormatDate(dateRange[1], "dd MMM yyyy")})`,
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
        "Completion",
      ];

      const rows = boardsWithTasks.map((board) => {
        // Group tasks by status
        const tasksByStatus = {
          todo: (board.tasks || []).filter((t) => t.status === "todo").map((t) => t.title),
          doing: (board.tasks || []).filter((t) => t.status === "doing").map((t) => t.title),
          onHold: (board.tasks || []).filter((t) => t.status === "onHold").map((t) => t.title),
          done: (board.tasks || []).filter((t) => t.status === "done").map((t) => t.title),
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
          board.boardName || "Untitled Board",
          safeFormatDate(board.createdAt, "dd MMM yyyy"),
          safeFormatDate(board.deadline, "dd MMM yyyy"),
          board.description || "No description",
          tasksText || "No tasks",
          board.status || "No status",
          `${board.completionPercentage || 0}%`,
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
        },
      });

      doc.save(
        `${employee.name}_${safeFormatDate(dateRange[0], "ddMMMyyyy")}-${safeFormatDate(dateRange[1], "ddMMMyyyy")}_report.pdf`
      );
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report. Please try again.");
    }
  };

  // Generate single board report
  const generateSingleBoardReport = async (board) => {
    if (!board || !employee) {
      console.error("Missing board or employee data");
      return;
    }

    try {
      // Fetch tasks for the selected board
      const tasks = await fetchTasks(board.id);

      // Create a PDF document
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // Add title and employee details
      doc.setFontSize(16);
      doc.text(`Board Report: ${board.boardName || "Untitled Board"}`, 15, 15);

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
        "Completion",
      ];

      const rows = [
        [
          board.boardName || "Untitled Board",
          safeFormatDate(board.createdAt, "dd MMM yyyy"),
          safeFormatDate(board.deadline, "dd MMM yyyy"),
          board.description || "No description",
          tasksText || "No tasks",
          board.status || "No status",
          `${board.completionPercentage || 0}%`,
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
        },
      });

      // Save the PDF
      doc.save(`${board.boardName || "Board"}-report.pdf`);
    } catch (error) {
      console.error("Error generating board report:", error);
      alert("Failed to generate board report. Please try again.");
    }
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
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Start Date"
                value={dateRange[0]}
                onChange={(newValue) => setDateRange([newValue, dateRange[1]])}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="End Date"
                value={dateRange[1]}
                onChange={(newValue) => setDateRange([dateRange[0], newValue])}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
          </LocalizationProvider>

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
        {loading ? (
          <Typography variant="h6" sx={{ textAlign: "center", my: 4 }}>
            Loading boards...
          </Typography>
        ) : filteredBoards.length === 0 ? (
          <Typography variant="h6" sx={{ textAlign: "center", my: 4 }}>
            No boards found for this employee
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {filteredBoards.map((board) => (
              <Grid item xs={12} sm={6} md={4} key={board.id}>
                <Link 
                  to={`/admin/boards/${board.id}`} 
                  state={{ fromEmployee: employeeId }} 
                  style={{ textDecoration: "none" }}
                >
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
                          {safeFormatDate(board.deadline, "dd MMM yyyy")}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Link>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Download Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            if (selectedBoard) {
              generateSingleBoardReport(selectedBoard);
            }
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
