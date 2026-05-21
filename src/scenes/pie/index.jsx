import { Box } from "@mui/material";
import Header from "../../components/Header";
import PieChart from "../../components/PieChart";

const Pie = () => {
  return (
    <Box m="20px">
      <Header title="DEPARTMENTS" subtitle="Board distribution and task status by team member" />
      <Box mt="20px">
        <PieChart />
      </Box>
    </Box>
  );
};

export default Pie;
