import { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, useTheme, Card } from '@mui/material';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, RadialBarChart, RadialBar,
         XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';
import { tokens } from "../theme";


const COLORS = [
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Turquoise
  '#45B7D1', // Sky Blue
  '#96CEB4', // Mint Green
  '#FFEEAD', // Soft Yellow
  '#D4A5A5', // Dusty Rose
  '#9B59B6', // Purple
  '#3498DB', // Blue
  '#FF9F43'  // Orange
];


const MultiChartDashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [data, setData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setError("You must be logged in to view the dashboard.");
          setLoading(false);
          return;
        }


        const [usersSnapshot, boardsSnapshot] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(query(collection(db, "boards"), where("memberIds", "array-contains", currentUser.uid)))
        ]);


        const userDetails = {};
        usersSnapshot.docs.forEach(doc => {
          userDetails[doc.id] = doc.data().firstName || `User-${doc.id.slice(0,4)}`;
        });


        const userBoardCounts = {};
        const statusCounts = {};


        boardsSnapshot.docs.forEach(doc => {
          const boardData = doc.data();
          const normalizedStatus = boardData.status?.toLowerCase().trim();
         
          boardData.memberIds?.forEach(memberId => {
            userBoardCounts[memberId] = (userBoardCounts[memberId] || 0) + 1;
           
            statusCounts[memberId] = statusCounts[memberId] || {
              completed: 0,
              inProgress: 0,
              toDo: 0
            };
           
            if (normalizedStatus === 'completed') statusCounts[memberId].completed++;
            if (normalizedStatus === 'in progress') statusCounts[memberId].inProgress++;
            if (normalizedStatus === 'to do') statusCounts[memberId].toDo++;
          });
        });


        const chartData = Object.entries(userBoardCounts)
          .filter(([userId]) => userDetails[userId])
          .map(([userId, boardCount], index) => ({
            name: userDetails[userId],
            value: boardCount,
            boards: boardCount,
            fill: COLORS[index % COLORS.length]
          }));


        const statusChartData = Object.entries(statusCounts)
          .filter(([userId]) => userDetails[userId])
          .map(([userId, counts]) => ({
            name: userDetails[userId],
            ...counts
          }));


        setData(chartData);
        setStatusData(statusChartData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load chart data');
        setLoading(false);
      }
    };


    if (auth.currentUser) {
      fetchData();
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) fetchData();
      });
      return () => unsubscribe();
    }
  }, []);


  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            p: 2,
            borderRadius: 1,
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            border: '1px solid #ddd'
          }}
        >
          <Typography sx={{ color: '#333', fontWeight: 'bold' }}>
            {payload[0].payload.name}
          </Typography>
          <Typography sx={{ color: payload[0].color }}>
            Boards: {payload[0].value}
          </Typography>
        </Box>
      );
    }
    return null;
  };


  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="500px">
        <CircularProgress />
      </Box>
    );
  }


  if (error) {
    return (
      <Box m="20px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }


  return (
    <Box p={4} sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Board Distribution Bar Chart */}
      <Card sx={{ p: 2, bgcolor: colors.primary[400], height: '600px' }}>
        <Typography variant="h6" sx={{ color: colors.grey[100], mb: 2 }}>
          Board Distribution - Bar Chart
        </Typography>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grey[200]} />
            <XAxis dataKey="name" stroke={colors.grey[200]} />
            <YAxis stroke={colors.grey[200]} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="boards" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>


      {/* Task Status Stacked Bar Chart */}
      <Card sx={{ p: 2, bgcolor: colors.primary[400], height: '600px' }}>
        <Typography variant="h6" sx={{ color: colors.grey[100], mb: 2 }}>
          Task Status Distribution - Stacked Bar Chart
        </Typography>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={statusData}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grey[200]} />
            <XAxis dataKey="name" stroke={colors.grey[200]} />
            <YAxis stroke={colors.grey[200]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="completed" stackId="a" fill="#4CAF50" />
            <Bar dataKey="inProgress" stackId="a" fill="#FFC107" />
            <Bar dataKey="toDo" stackId="a" fill="#F44336" />
          </BarChart>
        </ResponsiveContainer>
      </Card>


      {/* Board Distribution Pie Chart */}
      <Card sx={{ p: 2, bgcolor: colors.primary[400], height: '600px' }}>
        <Typography variant="h6" sx={{ color: colors.grey[100], mb: 2 }}>
          Board Distribution - Pie Chart
        </Typography>
        <ResponsiveContainer width="100%" height="90%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={200}
              label={(entry) => entry.name}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>


      {/* Board Distribution Radial Chart */}
      <Card sx={{ p: 2, bgcolor: colors.primary[400], height: '600px' }}>
        <Typography variant="h6" sx={{ color: colors.grey[100], mb: 2 }}>
          Board Distribution - Radial Chart
        </Typography>
        <ResponsiveContainer width="100%" height="90%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="10%"
            outerRadius="80%"
            barSize={20}
            data={data}
          >
            <RadialBar
              minAngle={15}
              label={{ position: 'insideStart', fill: '#fff' }}
              background
              dataKey="value"
            />
            <Legend />
            <Tooltip />
          </RadialBarChart>
        </ResponsiveContainer>
      </Card>


      {/* Board Distribution Line Chart */}
      <Card sx={{ p: 2, bgcolor: colors.primary[400], height: '600px' }}>
        <Typography variant="h6" sx={{ color: colors.grey[100], mb: 2 }}>
          Board Distribution - Line Chart
        </Typography>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grey[200]} />
            <XAxis dataKey="name" stroke={colors.grey[200]} />
            <YAxis stroke={colors.grey[200]} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="boards"
              stroke="#8884d8"
              strokeWidth={2}
              dot={{ fill: '#8884d8', r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </Box>
  );
};


export default MultiChartDashboard;

