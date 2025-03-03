import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  useTheme,
  Button,
  Menu,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  Chip
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../../utils/firebase";


const HistoryPage = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [boards, setBoards] = useState([]);
  const [filteredBoards, setFilteredBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('all');


  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    switch (statusLower) {
      case 'to do':
        return {
          backgroundColor: colors.blueAccent[500],
          color: '#fff'
        };
      case 'in progress':
        return {
          backgroundColor: colors.orangeAccent?.[500],
          color: '#fff'
        };
      case 'completed':
        return {
          backgroundColor: colors.greenAccent[500],
          color: '#fff'
        };
      default:
        return {
          backgroundColor: colors.grey[500],
          color: '#fff'
        };
    }
  };


  // Custom cell component for members dropdown
  const MemberDropdownCell = ({ members }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);


    const handleClick = (event) => {
      event.stopPropagation();
      setAnchorEl(event.currentTarget);
    };


    const handleClose = () => {
      setAnchorEl(null);
    };


    return (
      <div>
        <Button
          onClick={handleClick}
          variant="outlined"
          size="small"
          sx={{
            padding: '4px 8px',
            fontSize: '0.875rem',
            color: '#ffff',
            textTransform: 'none',
            borderColor: colors.grey[300],
            '&:hover': {
              backgroundColor: colors.primary[300],
              borderColor: colors.greenAccent[600]
            }
          }}
        >
          {members.length} Members
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          PaperProps={{
            style: {
              maxHeight: 200,
              width: '20ch',
            },
          }}
        >
          {members.map((member, index) => (
            <MenuItem key={index} onClick={handleClose}>
              {member.name}
            </MenuItem>
          ))}
          {members.length === 0 && (
            <MenuItem disabled>No members</MenuItem>
          )}
        </Menu>
      </div>
    );
  };


  const columns = [
    { field: "boardName", headerName: "Board Name", flex: 1.5 },
    { field: "description", headerName: "Description", flex: 2 },
    { field: "deadline", headerName: "Deadline", flex: 1 },
    { field: "createdAt", headerName: "Created At", flex: 1 },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => (
        <Chip
          label={params.value}
          sx={{
            ...getStatusColor(params.value),
            width: '100px',
            justifyContent: 'center',
            fontSize: '0.75rem',
            padding: '4px 8px',
            borderRadius: '4px'
          }}
        />
      )
    },
    {
      field: "members",
      headerName: "Members",
      renderCell: (params) => (
        <MemberDropdownCell members={params.value || []} />
      ),
    },
  ];


  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
    filterBoardsByMonth(event.target.value);
  };


  const filterBoardsByMonth = (month) => {
    if (month === 'all') {
      setFilteredBoards(boards);
      return;
    }


    const filtered = boards.filter(board => {
      const createdDate = new Date(board.createdAt);
      return createdDate.getMonth() === parseInt(month);
    });
    setFilteredBoards(filtered);
  };


  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setError("You must be logged in to view your board history.");
          return;
        }


        const boardsRef = collection(db, "boards");
        const q = query(
          boardsRef,
          where("memberIds", "array-contains", currentUser.uid)
        );
        const snapshot = await getDocs(q);


        const boardsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          boardName: doc.data().boardName,
          description: doc.data().description,
          createdAt: doc.data().createdAt?.toDate().toLocaleDateString() || "N/A",
          deadline: doc.data().deadline?.toDate().toLocaleDateString() || "No Deadline",
          createdBy: doc.data().createdBy,
          status: doc.data().status,
          members: doc.data().members || [],
        }));


        setBoards(boardsData);
        setFilteredBoards(boardsData);
      } catch (err) {
        console.error("Error fetching boards:", err);
        setError("Failed to load boards. Please try again later.");
      } finally {
        setLoading(false);
      }
    };


    fetchBoards();
  }, []);


  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" flexGrow={1}>
        <Typography variant="h6">Loading...</Typography>
      </Box>
    );
  }


  if (error) {
    return (
      <Box m="20px">
        <Header title="HISTORY" subtitle="Your Board Activity" />
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      </Box>
    );
  }


  return (
    <Box m="20px">
      <Header title="HISTORY" subtitle="Your Board Activity" />
     
      <Box mb={2}>
        <FormControl
          sx={{
            minWidth: 200,
            '& .MuiOutlinedInput-root': {
              color: colors.grey[100],
              '& fieldset': {
                borderColor: colors.greenAccent[500],
              },
              '&:hover fieldset': {
                borderColor: colors.greenAccent[400],
              },
              '&.Mui-focused fieldset': {
                borderColor: colors.greenAccent[300],
              }
            },
            '& .MuiInputLabel-root': {
              color: colors.grey[100],
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: colors.greenAccent[400],
            },
          }}
        >
          <InputLabel>Filter by Month</InputLabel>
          <Select
            value={selectedMonth}
            onChange={handleMonthChange}
            label="Filter by Month"
          >
            <MenuItem value="all">All Months</MenuItem>
            <MenuItem value="0">January</MenuItem>
            <MenuItem value="1">February</MenuItem>
            <MenuItem value="2">March</MenuItem>
            <MenuItem value="3">April</MenuItem>
            <MenuItem value="4">May</MenuItem>
            <MenuItem value="5">June</MenuItem>
            <MenuItem value="6">July</MenuItem>
            <MenuItem value="7">August</MenuItem>
            <MenuItem value="8">September</MenuItem>
            <MenuItem value="9">October</MenuItem>
            <MenuItem value="10">November</MenuItem>
            <MenuItem value="11">December</MenuItem>
          </Select>
        </FormControl>
      </Box>


      <Box
        m="40px 0 0 0"
        height="75vh"
        sx={{
          "& .MuiDataGrid-root": {
            border: "none",
          },
          "& .MuiDataGrid-cell": {
            borderBottom: "none",
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: colors.blueAccent[700],
            borderBottom: "none",
          },
          "& .MuiDataGrid-virtualScroller": {
            backgroundColor: colors.primary[400],
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: "none",
            backgroundColor: colors.blueAccent[700],
          },
          "& .MuiCheckbox-root": {
            color: `${colors.greenAccent[200]} !important`,
          },
        }}
      >
        <DataGrid
          rows={filteredBoards}
          columns={columns}
          loading={loading}
          disableSelectionOnClick
          getRowId={(row) => row.id}
        />
      </Box>
    </Box>
  );
};


export default HistoryPage;

