import { useState, useEffect, useRef } from "react";
import { Typography } from "@mui/material";

const AnimatedCounter = ({ value = 0, duration = 900, sx = {}, variant = "h5" }) => {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const startValRef = useRef(0);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    startValRef.current = display;
    const target = Number(value) || 0;

    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startValRef.current + (target - startValRef.current) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [value]);

  return (
    <Typography variant={variant} fontWeight={700} sx={sx}>
      {display}
    </Typography>
  );
};

export default AnimatedCounter;
