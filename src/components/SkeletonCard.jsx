import { Box, Skeleton } from "@mui/material";

export const SkeletonBoardCard = () => (
  <Box sx={{ borderRadius: 3, overflow: "hidden" }}>
    <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 3 }} />
  </Box>
);

export const SkeletonStatCard = () => (
  <Box sx={{ p: 2, borderRadius: 3 }}>
    <Box display="flex" alignItems="center" gap={2}>
      <Skeleton variant="circular" width={40} height={40} />
      <Box flex={1}>
        <Skeleton variant="text" width="60%" height={14} />
        <Skeleton variant="text" width="40%" height={28} />
      </Box>
    </Box>
  </Box>
);

export const SkeletonRow = () => (
  <Box display="flex" alignItems="center" gap={2} py={1}>
    <Skeleton variant="circular" width={32} height={32} />
    <Box flex={1}>
      <Skeleton variant="text" width="50%" />
      <Skeleton variant="text" width="30%" height={10} />
    </Box>
    <Skeleton variant="rectangular" width={60} height={20} sx={{ borderRadius: 1 }} />
  </Box>
);
