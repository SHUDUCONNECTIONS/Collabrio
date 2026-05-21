import { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, useTheme, Card } from '@mui/material';
import {
  PieChart, Pie, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';
import { tokens } from '../theme';

const COLORS = [
  '#1a8fff', '#4ECDC4', '#FF6B6B', '#96CEB4',
  '#FFEEAD', '#9B59B6', '#FF9F43', '#45B7D1', '#D4A5A5',
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
          setError('You must be logged in to view this page.');
          setLoading(false);
          return;
        }

        const [usersSnapshot, boardsSnapshot] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(query(collection(db, 'boards'), where('memberIds', 'array-contains', currentUser.uid))),
        ]);

        const userDetails = {};
        usersSnapshot.docs.forEach(doc => {
          userDetails[doc.id] = doc.data().firstName || `User-${doc.id.slice(0, 4)}`;
        });

        const userBoardCounts = {};
        const statusCounts = {};

        boardsSnapshot.docs.forEach(doc => {
          const board = doc.data();
          const normalizedStatus = board.status?.toLowerCase().trim();

          board.memberIds?.forEach(memberId => {
            userBoardCounts[memberId] = (userBoardCounts[memberId] || 0) + 1;

            statusCounts[memberId] = statusCounts[memberId] || { completed: 0, inProgress: 0, toDo: 0 };
            if (normalizedStatus === 'completed') statusCounts[memberId].completed++;
            else if (normalizedStatus === 'in progress') statusCounts[memberId].inProgress++;
            else if (normalizedStatus === 'to do') statusCounts[memberId].toDo++;
          });
        });

        const chartData = Object.entries(userBoardCounts)
          .filter(([id]) => userDetails[id])
          .map(([id, count], i) => ({
            name: userDetails[id],
            value: count,
            fill: COLORS[i % COLORS.length],
          }));

        const statusChartData = Object.entries(statusCounts)
          .filter(([id]) => userDetails[id])
          .map(([id, counts]) => ({ name: userDetails[id], ...counts }));

        setData(chartData);
        setStatusData(statusChartData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load chart data.');
        setLoading(false);
      }
    };

    if (auth.currentUser) {
      fetchData();
    } else {
      const unsub = auth.onAuthStateChanged(user => { if (user) fetchData(); });
      return () => unsub();
    }
  }, []);

  const PieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <Box sx={{ bgcolor: colors.primary[300], p: 1.5, borderRadius: 2, border: `1px solid ${colors.primary[200]}` }}>
        <Typography sx={{ color: colors.grey[100], fontWeight: 700 }}>{payload[0].name}</Typography>
        <Typography sx={{ color: payload[0].payload.fill }}>{payload[0].value} board{payload[0].value !== 1 ? 's' : ''}</Typography>
      </Box>
    );
  };

  const BarTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <Box sx={{ bgcolor: colors.primary[300], p: 1.5, borderRadius: 2, border: `1px solid ${colors.primary[200]}` }}>
        <Typography sx={{ color: colors.grey[100], fontWeight: 700, mb: 0.5 }}>{label}</Typography>
        {payload.map(p => (
          <Typography key={p.dataKey} sx={{ color: p.fill }}>
            {p.name}: {p.value}
          </Typography>
        ))}
      </Box>
    );
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress sx={{ color: colors.blueAccent[400] }} />
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
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 3,
        p: 0,
      }}
    >
      {/* Donut — Board Distribution */}
      <Card sx={{ p: 3, bgcolor: colors.primary[400], borderRadius: 3, boxShadow: 4 }}>
        <Typography variant="h5" fontWeight={700} color={colors.grey[100]} mb={0.5}>
          Board Distribution
        </Typography>
        <Typography variant="body2" color={colors.grey[400]} mb={2}>
          Boards per team member
        </Typography>
        <ResponsiveContainer width="100%" height={340}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="78%"
              paddingAngle={3}
              labelLine={false}
              label={renderCustomLabel}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
            <Legend
              iconType="circle"
              formatter={(value) => (
                <span style={{ color: colors.grey[100], fontSize: 13 }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Stacked Bar — Task Status */}
      <Card sx={{ p: 3, bgcolor: colors.primary[400], borderRadius: 3, boxShadow: 4 }}>
        <Typography variant="h5" fontWeight={700} color={colors.grey[100]} mb={0.5}>
          Task Status
        </Typography>
        <Typography variant="body2" color={colors.grey[400]} mb={2}>
          Completed · In Progress · To Do per member
        </Typography>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={statusData} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.primary[300]} vertical={false} />
            <XAxis dataKey="name" stroke={colors.grey[400]} tick={{ fill: colors.grey[300], fontSize: 12 }} />
            <YAxis stroke={colors.grey[400]} tick={{ fill: colors.grey[300], fontSize: 12 }} allowDecimals={false} />
            <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Legend
              formatter={(value) => (
                <span style={{ color: colors.grey[100], fontSize: 13 }}>
                  {value === 'completed' ? 'Completed' : value === 'inProgress' ? 'In Progress' : 'To Do'}
                </span>
              )}
            />
            <Bar dataKey="completed" stackId="a" fill="#4CAF50" radius={[0, 0, 0, 0]} />
            <Bar dataKey="inProgress" stackId="a" fill="#FFC107" />
            <Bar dataKey="toDo" stackId="a" fill="#F44336" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </Box>
  );
};

export default MultiChartDashboard;
