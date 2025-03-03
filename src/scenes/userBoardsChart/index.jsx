import { useState, useEffect } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { tokens } from "../../theme";


const UserBoardsChart = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({
    totalUsers: 0,
    totalBoards: 0,
    validMembers: 0,
    invalidMembers: 0,
  });


  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersSnapshot, boardsSnapshot] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'boards'))
        ]);


        setDebugInfo(prev => ({
          ...prev,
          totalUsers: usersSnapshot.docs.length,
          totalBoards: boardsSnapshot.docs.length,
        }));


        const userDetails = {};
        usersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          userDetails[doc.id] = {
            name: userData.firstName || `User-${doc.id.slice(0, 4)}`,
            email: userData.email
          };
        });


        const boardCountsByUser = {};
        let validMembers = 0;
        let invalidMembers = 0;


        boardsSnapshot.docs.forEach(doc => {
          const memberIds = doc.data().memberIds || [];
          memberIds.forEach(memberId => {
            if (userDetails[memberId]) {
              boardCountsByUser[memberId] = (boardCountsByUser[memberId] || 0) + 1;
              validMembers++;
            } else {
              invalidMembers++;
            }
          });
        });


        setDebugInfo(prev => ({
          ...prev,
          validMembers,
          invalidMembers,
        }));


        const processedData = Object.keys(userDetails).map(userId => ({
          user: userDetails[userId].name,
          boards: boardCountsByUser[userId] || 0,
          email: userDetails[userId].email,
        })).sort((a, b) => b.boards - a.boards);


        setChartData(processedData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load chart data');
        setLoading(false);
      }
    };


    fetchData();
  }, []);


  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
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
    <Box m="20px">
      {/* <Header title="USER BOARDS" subtitle="Board Distribution Across Users" /> */}
     
      {/* <Alert severity="info" sx={{ mb: 2 }}>
        Debug Info: Found {debugInfo.totalUsers} users and {debugInfo.totalBoards} boards
        ({debugInfo.validMembers} valid members, {debugInfo.invalidMembers} invalid members)
      </Alert> */}


      <Box
        height="53vh"
        border={`1px solid ${colors.grey[100]}`}
        borderRadius="4px"
        bgcolor={colors.primary[400]}
        p={2}
      >
        <ResponsiveBar
          data={chartData}
          keys={['boards']}
          indexBy="user"
          margin={{ top: 10, right: 30, bottom: 70, left: 60 }}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          colors={colors.greenAccent[500]}
          borderRadius={4}
          borderColor={{
            from: 'color',
            modifiers: [['darker', 1.6]]
          }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            // tickPadding: 5,
            tickRotation: -45,
            legend: 'Users',
            legendPosition: 'middle',
            legendOffset: 55,
            tickColor: colors.grey[100],
            legendColor: colors.grey[100],
            textColor: colors.grey[100]
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Number of Boards',
            legendPosition: 'middle',
            legendOffset: -50,
            tickColor: colors.grey[100],
            textColor: colors.grey[100],
            legendColor: colors.grey[100]
          }}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor={colors.grey[100]}
          theme={{
            axis: {
              ticks: {
                text: {
                  fill: colors.grey[100],
                  fontSize: 12
                }
              },
              legend: {
                text: {
                  fill: colors.grey[100],
                  fontSize: 13
                }
              }
            },
            grid: {
              line: {
                stroke: colors.grey[100],
                strokeWidth: 1
              }
            },
            labels: {
              text: {
                fill: colors.grey[100],
                fontSize: 12,
                fontWeight: 500
              }
            }
          }}
          tooltip={({ value, indexValue, data }) => (
            <Box
              sx={{
                bgcolor: colors.primary[400],
                p: 1,
                border: `1px solid ${colors.grey[100]}`,
                borderRadius: 1
              }}
            >
              <Typography variant="subtitle2" color={colors.grey[100]}>{indexValue}</Typography>
              <Typography variant="body2" color={colors.grey[100]}>Boards: {value}</Typography>
              {data.email && (
                <Typography variant="body2" color={colors.grey[300]}>
                  {data.email}
                </Typography>
              )}
            </Box>
          )}
        />
      </Box>
    </Box>
  );
};


export default UserBoardsChart;

