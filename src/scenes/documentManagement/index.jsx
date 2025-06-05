// Enhanced DocumentManagement Component with uploader name, delete functionality, and Excel support

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Description as DocumentIcon,
  InsertDriveFile as FileIcon,
  Visibility as VisibilityIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  TableChart as ExcelIcon,
} from "@mui/icons-material";
import {
  doc,
  updateDoc,
  arrayRemove,
} from "firebase/firestore";
import {
  ref,
  deleteObject,
} from "firebase/storage";
import { auth, db, storage } from "../../utils/firebase";

const DocumentManagement = ({ documents, onUpload, isUploading, boardId }) => {
  const theme = useTheme();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0 && onUpload) {
      onUpload(files);
    }
  };

  const handleDeleteDocument = async (document) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;
    
    setIsDeleting(true);
    try {
      // Delete from Firebase Storage
      if (documentToDelete.storagePath) {
        const storageRef = ref(storage, documentToDelete.storagePath);
        await deleteObject(storageRef);
      }

      // Remove from Firestore
      const boardRef = doc(db, "boards", boardId);
      await updateDoc(boardRef, {
        documents: arrayRemove(documentToDelete),
      });

      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    } catch (error) {
      console.error("Error deleting document:", error);
      // You might want to show an error message to the user here
    } finally {
      setIsDeleting(false);
    }
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    if (['xlsx', 'xls', 'csv'].includes(extension)) {
      return <ExcelIcon color="success" />;
    }
    return <FileIcon color="primary" />;
  };

  const getFileTypeLabel = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'xlsx':
      case 'xls':
        return 'Excel';
      case 'csv':
        return 'CSV';
      case 'pdf':
        return 'PDF';
      case 'doc':
      case 'docx':
        return 'Word';
      case 'txt':
        return 'Text';
      case 'fig':
        return 'Figma';
      case 'sketch':
        return 'Sketch';
      default:
        return extension.toUpperCase();
    }
  };

  return (
    <Box sx={{ mt: 2, width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <DocumentIcon sx={{ color: 'primary.main' }} />
        <Typography 
          variant="h6" 
          sx={{ 
            flexGrow: 1,
            color: 'text.primary',
            fontWeight: 600
          }}
        >
          Project Documents
        </Typography>
        <input
          type="file"
          id="document-upload"
          hidden
          multiple
          onChange={handleFileUpload}
          accept=".pdf,.doc,.docx,.txt,.fig,.sketch,.xlsx,.xls,.csv"
        />
        <label htmlFor="document-upload">
          <Button
            component="span"
            variant="outlined"
            startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
            disabled={isUploading}
            size="small"
            sx={{
              color: 'text.primary',
              borderColor: alpha(theme.palette.primary.main, 0.5),
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, 0.04),
              }
            }}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </label>
      </Box>

      {documents && documents.length > 0 && (
        <Paper 
          sx={{ 
            p: 2, 
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
            backdropFilter: 'blur(10px)'
          }}
        >
          <List dense>
            {documents.map((doc, index) => (
              <ListItem 
                key={index} 
                divider={index !== documents.length - 1}
                sx={{
                  '&:hover': {
                    bgcolor: alpha(theme.palette.action.hover, 0.5),
                    borderRadius: 1,
                  }
                }}
              >
                <ListItemIcon>
                  {getFileIcon(doc.name)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ color: 'text.primary', fontWeight: 500 }}>
                        {doc.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          fontWeight: 600,
                        }}
                      >
                        {getFileTypeLabel(doc.name)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                      </Typography>
                      {doc.uploadedBy && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                          By: {doc.uploadedBy.name || doc.uploadedBy.email}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                      edge="end"
                      onClick={() => window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(doc.url)}`, "_blank")}
                      size="small"
                      sx={{ 
                        color: 'text.secondary',
                        '&:hover': { 
                          color: 'primary.main',
                          bgcolor: alpha(theme.palette.primary.main, 0.08)
                        }
                      }}
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = doc.url;
                        link.download = doc.name;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      size="small"
                      sx={{
                        color: 'text.secondary',
                        '&:hover': { 
                          color: 'primary.main',
                          bgcolor: alpha(theme.palette.primary.main, 0.08)
                        }
                      }}
                    >
                      <DownloadIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteDocument(doc)}
                      size="small"
                      sx={{
                        color: 'text.secondary',
                        '&:hover': { 
                          color: 'error.main',
                          bgcolor: alpha(theme.palette.error.main, 0.08)
                        }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isDeleting && setDeleteDialogOpen(false)}
        PaperProps={{
          sx: { 
            borderRadius: 3,
            bgcolor: 'background.paper'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Delete Document
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.primary' }}>
            Are you sure you want to delete "{documentToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isDeleting}
            sx={{ color: "text.secondary", textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteDocument}
            variant="contained"
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
            sx={{ 
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Enhanced document upload handler
const handleDocumentUpload = async (files) => {
  setIsUploading(true);
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const uploadPromises = files.map(async (file) => {
      const filename = `${Date.now()}_${file.name}`;
      const storagePath = `documents/${boardId}/${filename}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          null,
          (error) => reject(error),
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              name: file.name,
              url: downloadURL,
              storagePath: storagePath, // Store the storage path for deletion
              uploadedAt: new Date().toISOString(),
              uploadedBy: {
                uid: currentUser.uid,
                name: currentUser.displayName,
                email: currentUser.email,
              },
            });
          }
        );
      });
    });

    const uploadedDocs = await Promise.all(uploadPromises);

    const boardRef = doc(db, "boards", boardId);
    await updateDoc(boardRef, {
      documents: arrayUnion(...uploadedDocs),
    });
  } catch (error) {
    console.error("Error uploading documents:", error);
    setError("Failed to upload documents");
  } finally {
    setIsUploading(false);
  }
};

export default DocumentManagement;
