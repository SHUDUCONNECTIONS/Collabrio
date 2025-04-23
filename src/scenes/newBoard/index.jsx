import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  CircularProgress,
  ListItemText,
  Checkbox,
  ListItemIcon,
  Alert,
  IconButton,
  Chip,
  FormControlLabel,
  useTheme,
} from "@mui/material";
import { Formik } from "formik";
import * as yup from "yup";
import useMediaQuery from "@mui/material/useMediaQuery";
import Header from "../../components/Header";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth, storage } from "../../utils/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CancelIcon from "@mui/icons-material/Cancel";

const AddBoard = () => {
  const isNonMobile = useMediaQuery("(min-width:600px)");
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileUploading, setFileUploading] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        const usersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersData);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleFileUpload = async (files, uploaderName, boardId) => {
    if (!files || files.length === 0) return [];

    setFileUploading(true);
    try {
      const currentUser = auth.currentUser;
      const uploadPromises = files.map(async (file) => {
        const filename = `${uploaderName}_${Date.now()}_${file.name}`;
        const path = `documents/${boardId}/files/${filename}`;
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress =
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log(`Uploading ${file.name}: ${progress.toFixed(2)}%`);
            },
            (error) => {
              console.error(`Error uploading ${file.name}:`, error);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                name: file.name,
                path,
                url: downloadURL,
                uploadedAt: new Date().toISOString(),
                uploadedBy: {
                  uid: currentUser.uid,
                  email: currentUser.email,
                  displayName: uploaderName,
                },
                type: getFileType(file.name),
              });
            }
          );
        });
      });

      const uploadedDocuments = await Promise.all(uploadPromises);
      setFileUploading(false);
      return uploadedDocuments;
    } catch (error) {
      console.error("Error uploading files:", error);
      setFileUploading(false);
      setError("Failed to upload files");
      return [];
    }
  };

  const createBoard = async (values, uploaderName) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser)
        throw new Error("You must be logged in to create a board");

      // Now members can be empty, so we handle that case
      const allMemberIds = [...new Set([currentUser.uid, ...values.members])];

      const boardData = {
        ...values,
        status: "To Do",
        createdAt: Timestamp.now(),
        // Only set deadline if noDeadline is false
        deadline: values.noDeadline ? null : Timestamp.fromDate(new Date(values.deadline)),
        members: allMemberIds
          .map((memberId) => {
            const user = users.find((user) => user.id === memberId);
            return user
              ? {
                  id: user.id,
                  name: `${user.firstName} ${user.surname}`.trim(),
                  email: user.email,
                }
              : null;
          })
          .filter(Boolean),
        memberIds: allMemberIds,
        createdBy: currentUser.uid,
        createdByDetails: {
          id: currentUser.uid,
          name: uploaderName,
          email: currentUser.email,
        },
        documents: [],
      };

      const boardRef = await addDoc(collection(db, "boards"), boardData);
      return boardRef.id;
    } catch (error) {
      console.error("Error creating board:", error);
      throw error;
    }
  };

  const handleFormSubmit = async (values, { setSubmitting }) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError("You must be logged in to create a board");
        return;
      }

      const userRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userRef);
      const uploaderName = userDoc.exists()
        ? `${userDoc.data().firstName || ""} ${
            userDoc.data().surname || ""
          }`.trim()
        : "Unknown";

      const boardId = await createBoard(values, uploaderName);

      let uploadedDocuments = [];
      if (files.length > 0) {
        uploadedDocuments = await handleFileUpload(
          files,
          uploaderName,
          boardId
        );
        if (uploadedDocuments.length !== files.length) {
          throw new Error("Some files failed to upload");
        }
      }

      const boardRef = doc(db, "boards", boardId);
      await updateDoc(boardRef, {
        documents: uploadedDocuments,
      });

      navigate("../boards");
    } catch (error) {
      console.error("Error:", error);
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to determine file type
  const getFileType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'PDF';
      case 'doc':
      case 'docx':
        return 'Word';
      case 'xls':
      case 'xlsx':
        return 'Excel';
      case 'csv':
        return 'CSV';
      default:
        return 'Other';
    }
  };

  // Helper function to get color for file type
  const getFileColor = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf':
        return theme.palette.mode === 'dark' ? '#ff7961' : '#f44336';
      case 'doc':
      case 'docx':
        return theme.palette.mode === 'dark' ? '#64b5f6' : '#2196f3';
      case 'xls':
      case 'xlsx':
      case 'csv':
        return theme.palette.mode === 'dark' ? '#81c784' : '#4caf50';
      default:
        return theme.palette.mode === 'dark' ? '#a5a5a5' : '#757575';
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexGrow={1}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        flexGrow={1}
        m="20px"
        display="flex"
        flexDirection="column"
        alignItems="center"
      >
        <Header
          title="CREATE BOARD"
          subtitle="Add a New Board to Your Workspace"
        />
        <Box width={isNonMobile ? "80%" : "100%"} maxWidth="800px">
          {error && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Formik
            onSubmit={handleFormSubmit}
            initialValues={initialValues}
            validationSchema={boardSchema}
          >
            {({
              values,
              errors,
              touched,
              handleBlur,
              handleChange,
              handleSubmit,
              setFieldValue,
              isSubmitting,
            }) => (
              <form onSubmit={handleSubmit}>
                <Box
                  display="grid"
                  gap="20px"
                  gridTemplateColumns="repeat(4, minmax(0, 1fr))"
                  sx={{
                    "& > div": {
                      gridColumn: isNonMobile ? undefined : "span 4",
                    },
                    backgroundColor: theme.palette.mode === "dark" 
                      ? theme.palette.background.paper 
                      : theme.palette.background.default,
                    p: 2,
                    borderRadius: 1,
                  }}
                >
                  <TextField
                    fullWidth
                    variant="filled"
                    type="text"
                    label="Board Name"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    value={values.boardName}
                    name="boardName"
                    error={!!touched.boardName && !!errors.boardName}
                    helperText={touched.boardName && errors.boardName}
                    sx={{ gridColumn: "span 4" }}
                  />

                  <TextField
                    fullWidth
                    variant="filled"
                    type="text"
                    label="Description"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    value={values.description}
                    name="description"
                    error={!!touched.description && !!errors.description}
                    helperText={touched.description && errors.description}
                    multiline
                    rows={4}
                    sx={{ gridColumn: "span 4" }}
                  />

                  <FormControl
                    fullWidth
                    variant="filled"
                    sx={{ gridColumn: "span 4" }}
                  >
                    <InputLabel id="priority-label">Priority</InputLabel>
                    <Select
                      labelId="priority-label"
                      value={values.priority}
                      onChange={handleChange}
                      name="priority"
                      error={!!touched.priority && !!errors.priority}
                    >
                      <MenuItem value="High">High</MenuItem>
                      <MenuItem value="Medium">Medium</MenuItem>
                      <MenuItem value="Low">Low</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl
                    fullWidth
                    variant="filled"
                    sx={{ gridColumn: "span 4" }}
                  >
                    <InputLabel id="members-label">Choose Members (Optional)</InputLabel>
                    <Select
                      labelId="members-label"
                      multiple
                      value={values.members}
                      onChange={(event) =>
                        setFieldValue("members", event.target.value)
                      }
                      renderValue={(selected) =>
                        selected.length === 0 
                          ? <em>No members selected</em>
                          : selected
                              .map((id) => {
                                const user = users.find((user) => user.id === id);
                                return user
                                  ? `${user.firstName} ${user.surname}`
                                  : "";
                              })
                              .filter(Boolean)
                              .join(", ")
                      }
                    >
                      {users
                        .filter((user) => user.id !== auth.currentUser?.uid)
                        .map((user) => (
                          <MenuItem key={user.id} value={user.id}>
                            <ListItemIcon>
                              <Checkbox
                                checked={values.members.indexOf(user.id) > -1}
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${user.firstName} ${user.surname}`}
                              secondary={user.email}
                            />
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={values.noDeadline}
                        onChange={(e) => {
                          setFieldValue("noDeadline", e.target.checked);
                          if (e.target.checked) {
                            // Clear the deadline if "No Deadline" is checked
                            setFieldValue("deadline", null);
                          }
                        }}
                        name="noDeadline"
                      />
                    }
                    label="No Deadline"
                    sx={{ gridColumn: "span 4" }}
                  />

                  {!values.noDeadline && (
                    <DatePicker
                      label="Deadline"
                      value={values.deadline}
                      onChange={(date) => setFieldValue("deadline", date)}
                      minDate={new Date()}
                      disabled={values.noDeadline}
                      sx={{ gridColumn: "span 4" }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          variant="filled"
                          error={!!touched.deadline && !!errors.deadline && !values.noDeadline}
                          helperText={touched.deadline && errors.deadline && !values.noDeadline ? errors.deadline : ""}
                          sx={{ gridColumn: "span 4" }}
                        />
                      )}
                    />
                  )}

                  <Box sx={{ gridColumn: "span 4" }}>
                    <input
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
                      style={{ display: "none" }}
                      id="file-upload"
                      type="file"
                      multiple
                      onChange={(e) =>
                        setFiles([...files, ...Array.from(e.target.files)])
                      }
                    />
                    <label htmlFor="file-upload">
                      <IconButton 
                        component="span" 
                        color="secondary"
                        sx={{
                          color: theme.palette.secondary.main,
                        }}
                      >
                        <CloudUploadIcon />
                      </IconButton>
                      <span>
                        {files.length > 0
                          ? `${files.length} files selected`
                          : "Upload documents (PDF, Word, Excel, CSV)"}
                      </span>
                    </label>
                    {fileUploading && <CircularProgress size={24} />}

                    <Box
                      sx={{
                        mt: 1,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.5,
                      }}
                    >
                      {files.map((file, index) => (
                        <Chip
                          key={index}
                          label={`${file.name} (${getFileType(file.name)})`}
                          onDelete={() =>
                            setFiles(files.filter((_, i) => i !== index))
                          }
                          deleteIcon={<CancelIcon />}
                          variant="outlined"
                          sx={{
                            bgcolor: getFileColor(file.name),
                            '& .MuiChip-label': {
                              color: theme.palette.getContrastText(getFileColor(file.name))
                            }
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>

                <Box display="flex" justifyContent="center" mt="20px">
                  <Button
                    type="submit"
                    color="secondary"
                    variant="contained"
                    disabled={isSubmitting || fileUploading}
                    sx={{
                      width: "100%",
                      py: 1.5,
                      px: 4,
                      fontSize: "1rem",
                    }}
                  >
                    {isSubmitting ? (
                      <CircularProgress size={24} />
                    ) : (
                      "Create Board"
                    )}
                  </Button>
                </Box>
              </form>
            )}
          </Formik>
          </Box>
      </Box>
    </LocalizationProvider>
  );
};

const boardSchema = yup.object().shape({
  boardName: yup.string().required("Board Name is required"),
  description: yup.string().required("Description is required"),
  priority: yup.string().required("Priority is required"),
  members: yup.array(), // Remove the min and required constraints
  deadline: yup.date().nullable().test({
    name: 'deadline-required',
    test: function(value, context) {
      // Only require deadline if noDeadline is false
      return context.parent.noDeadline || value 
        ? true 
        : this.createError({ message: 'Deadline is required if "No Deadline" is not checked' });
    }
  }),
  noDeadline: yup.boolean(), // New field for the "No Deadline" checkbox
  documents: yup.array().test('fileFormat', 'Invalid file format', function(value) {
    if (!value) return true;
    const validFormats = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv'];
    return value.every(file => 
      validFormats.some(format => file.name.toLowerCase().endsWith(format))
    );
  }).optional(),
});

const initialValues = {
  boardName: "",
  description: "",
  priority: "Medium",
  members: [],
  deadline: null,
  noDeadline: false, // New field for the "No Deadline" checkbox
  documents: [],
};

export default AddBoard;
