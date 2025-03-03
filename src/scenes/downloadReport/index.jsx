import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  MenuItem,
  // useTheme,
} from "@mui/material";
import { Download } from "@mui/icons-material";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../utils/firebase";


const WeeklyReportDownloader = ({ boards, employees }) => {
  // const theme = useTheme();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");


  const fetchTasks = async (boardId) => {
    const tasksRef = collection(db, `boards/${boardId}/tasks`);
    const tasksSnapshot = await getDocs(tasksRef);
    return tasksSnapshot.docs.map((doc) => ({
      title: doc.data().title,
      status: doc.data().status,
    }));
  };


  const handleDownload = async (format) => {
    if (!startDate || !endDate || !selectedEmployee || !boards) return;


    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);


    // Filter boards for selected employee within the date range
    const filteredBoards = boards.filter((board) => {
      const boardDate = new Date(board.createdAt);
      const isInDateRange =
        boardDate >= startDateTime && boardDate <= endDateTime;
      const isEmployeeBoard = board.memberIds?.includes(selectedEmployee);
      return isInDateRange && isEmployeeBoard;
    });


    // Get employee details
    const employee = employees.find((emp) => emp.id === selectedEmployee);


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
        todo: board.tasks
          .filter((t) => t.status === "todo")
          .map((t) => t.title),
        doing: board.tasks
          .filter((t) => t.status === "doing")
          .map((t) => t.title),
        onHold: board.tasks
          .filter((t) => t.status === "onHold")
          .map((t) => t.title),
        done: board.tasks
          .filter((t) => t.status === "done")
          .map((t) => t.title),
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
        formatDate(board.createdAt),
        formatDate(board.deadline),
        board.description || "",
        tasksText,
        board.status,
        board.members?.map((m) => `${m.name} (${m.email})`).join("; ") || "",
      ];
    });


    if (format === "csv") {
      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");


      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);


      const employeeName =
        employee?.name.replace(/\s+/g, "_").toLowerCase() || "employee";
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `${employeeName}_report_${formatDate(startDateTime)}_${formatDate(
          endDateTime
        )}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === "pdf") {
      // Create PDF in landscape orientation
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });


      // Add title and employee details
      doc.setFontSize(16);
      doc.text(
        `Employee Report (${formatDate(startDateTime)} - ${formatDate(
          endDateTime
        )})`,
        15,
        15
      );


      doc.setFontSize(12);
      doc.text(`Name: ${employee?.name || "N/A"}`, 15, 25);
      doc.text(`Email: ${employee?.email || "N/A"}`, 15, 32);


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


      const employeeName =
        employee?.name.replace(/\s+/g, "_").toLowerCase() || "employee";
      doc.save(
        `${employeeName}_report_${formatDate(startDateTime)}_${formatDate(
          endDateTime
        )}.pdf`
      );
    }
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
    <Card sx={{ maxWidth: 600, mx: "auto", mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Download Employee Report
        </Typography>


        <Box sx={{ mt: 2 }}>
          <TextField
            select
            fullWidth
            label="Select Employee"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            sx={{ mb: 2 }}
          >
            {employees.map((employee) => (
              <MenuItem key={employee.id} value={employee.id}>
                {employee.name} ({employee.email})
              </MenuItem>
            ))}
          </TextField>


          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
              mb: 2,
            }}
          >
            <TextField
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{
                max: endDate || new Date().toISOString().split("T")[0],
              }}
            />
            <TextField
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{
                min: startDate,
                max: new Date().toISOString().split("T")[0],
              }}
            />
          </Box>


          <Button
            variant="contained"
            fullWidth
            startIcon={<Download />}
            onClick={() => handleDownload("csv")}
            disabled={!startDate || !endDate || !selectedEmployee}
            sx={{ mt: 2, mb: 1 }}
          >
            Download Employee Report (CSV)
          </Button>


          <Button
            variant="contained"
            fullWidth
            startIcon={<Download />}
            onClick={() => handleDownload("pdf")}
            disabled={!startDate || !endDate || !selectedEmployee}
            sx={{ mt: 1 }}
          >
            Download Employee Report (PDF)
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};


export default WeeklyReportDownloader;





