import { Box, Tooltip } from "@mui/material";

const STATUS_COLORS = {
  online: "#44b700",
  away: "#ffc107",
  offline: "#9e9e9e",
};

const STATUS_LABELS = {
  online: "Online",
  away: "Away",
  offline: "Offline",
};

const PresenceDot = ({ online, size = 12, sx = {} }) => {
  const status = online ? "online" : "offline";
  return (
    <Tooltip title={STATUS_LABELS[status]} placement="top" arrow>
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: "50%",
          bgcolor: STATUS_COLORS[status],
          border: "2px solid white",
          flexShrink: 0,
          ...sx,
        }}
      />
    </Tooltip>
  );
};

export default PresenceDot;
