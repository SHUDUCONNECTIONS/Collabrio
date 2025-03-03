import { useState } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import { Formik } from "formik";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";
import { auth } from "../../utils/firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
} from "firebase/auth";

const LoginForm = ({ onAuthentication }) => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleFormSubmit = async (values, { setSubmitting }) => {
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      onAuthentication(); // Mark user as authenticated
      navigate("/dashboard"); // Redirect to dashboard
    } catch (err) {
      console.error("Error during login:", err);
      switch (err.code) {
        case "auth/invalid-email":
          setError("Invalid email address format.");
          break;
        case "auth/user-disabled":
          setError("This account has been disabled.");
          break;
        case "auth/user-not-found":
          setError("No account found with this email.");
          break;
        case "auth/wrong-password":
          setError("Incorrect password.");
          break;
        case "auth/too-many-requests":
          setError("Too many failed attempts. Please try again later.");
          break;
        case "auth/network-request-failed":
          setError("Network error. Please check your connection.");
          break;
        default:
          setError("An error occurred during login. Please try again.");
      }
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onAuthentication(); // Mark user as authenticated
      navigate("/dashboard"); // Redirect to dashboard
    } catch (err) {
      console.error("Error during Google login:", err);
      setError("An error occurred during Google sign-in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (email) => {
    if (!email) {
      setError("Please enter your email address to reset the password.");
      return;
    }

    setError("");
    setLoading(true);
    setIsResettingPassword(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
    } catch (err) {
      console.error("Error sending password reset email:", err);
      switch (err.code) {
        case "auth/user-not-found":
          setError("No user found with this email address.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        default:
          setError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
      setTimeout(() => {
        setIsResettingPassword(false);
        setResetEmailSent(false);
      }, 5000);
    }
  };

  const textFieldSx = {
    "& .MuiFilledInput-root": {
      backgroundColor: "rgba(255, 255, 255, 0.05)",
      borderRadius: "8px",
      marginBottom: "20px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      "&:hover": {
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        borderColor: "#4cceac",
      },
      "&.Mui-focused": {
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        borderColor: "#4cceac",
      },
    },
    "& .MuiFilledInput-input": {
      color: "#ffffff",
      padding: "20px",
      fontSize: "1rem",
    },
    "& .MuiInputLabel-root": {
      color: "rgba(255, 255, 255, 0.7)",
    },
  };

  const loginSchema = yup.object().shape({
    email: yup.string().email("Invalid email").required("Required"),
    password: yup.string().min(6, "Minimum 6 characters").required("Required"),
  });

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{
        background: `linear-gradient(rgba(20, 27, 45, 0.8), rgba(20, 27, 45, 0.9)), url('assets/download.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        padding: "20px",
      }}
    >
      <Box
        width="100%"
        maxWidth="500px"
        p="32px"
        borderRadius="12px"
        boxShadow="0px 4px 20px rgba(0, 0, 0, 0.3)"
        bgcolor="#1f2940"
      >
        <Box display="flex" justifyContent="center" mb={4}>
          <img
            src="/SHUDU CONNNECTIONS transparency.png"
            alt="Company Logo"
            style={{ width: "150px", height: "auto" }}
          />
        </Box>

        <Typography variant="h4" align="center" gutterBottom color="#ffffff" fontWeight="bold">
          LOGIN
        </Typography>
        <Typography variant="subtitle1" align="center" gutterBottom color="secondary">
          Access Your Account
        </Typography>

        {error && (
          <Typography color="error" align="center" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        {resetEmailSent && (
          <Typography color="success" align="center" sx={{ mb: 2 }}>
            Password reset email sent! Check your inbox.
          </Typography>
        )}

        <Formik
          initialValues={{ email: "", password: "" }}
          validationSchema={loginSchema}
          onSubmit={handleFormSubmit}
        >
          {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => (
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                variant="filled"
                type="email"
                label="Email"
                name="email"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.email}
                error={touched.email && !!errors.email}
                helperText={touched.email && errors.email}
                sx={textFieldSx}
              />
              <TextField
                fullWidth
                variant="filled"
                type="password"
                label="Password"
                name="password"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.password}
                error={touched.password && !!errors.password}
                helperText={touched.password && errors.password}
                sx={textFieldSx}
              />
              <Box display="flex" flexDirection="column" gap={2} mt={2}>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                  sx={{ backgroundColor: "#4cceac", color: "white" }}
                >
                  {loading ? "Signing in..." : "Login"}
                </Button>
                {/* <Button
                  onClick={handleGoogleLogin}
                  variant="outlined"
                  fullWidth
                  disabled={loading}
                  sx={{ color: "white", borderColor: "#4cceac" }}
                >
                  Sign in with Google
                </Button> */}
                <Button
                  onClick={() => handlePasswordReset(values.email)}
                  variant="text"
                  fullWidth
                  disabled={loading || isResettingPassword}
                  sx={{ color: "white" }}
                >
                  {isResettingPassword ? "Sending reset email..." : "Forgot Password?"}
                </Button>
                <Button
                  onClick={() => navigate("/sign-up")}
                  variant="outlined"
                  fullWidth
                  sx={{ color: "white", borderColor: "#4cceac" }}
                >
                  Sign Up
                </Button>
              </Box>
            </form>
          )}
        </Formik>
      </Box>
    </Box>
  );
};

export default LoginForm;
