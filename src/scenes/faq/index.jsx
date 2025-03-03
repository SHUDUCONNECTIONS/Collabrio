import{ useState } from 'react';
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse
} from "@mui/material";
import {
  DragHandle,
  Edit as EditIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckBoxOutlineBlank as TaskIcon
} from '@mui/icons-material';
import Header from "../../components/Header";


const Board = ({ title, members }) => {
  const [tasks, setTasks] = useState({
    todo: [
      { id: '1', title: 'Task 1', checklist: [{ id: '1-1', text: 'Subtask 1', completed: false }] },
      { id: '2', title: 'Task 2', checklist: [{ id: '2-2', text: 'Subtask 2', completed: false }] }
    ],
    doing: [
      { id: '3', title: 'Task 3', checklist: [{ id: '3-3', text: 'Subtask 3', completed: false }] }
    ],
    done: [
      { id: '4', title: 'Task 4', checklist: [{ id: '4-4', text: 'Subtask 4', completed: false }] }
    ]
  });
 
  const [expandedTasks, setExpandedTasks] = useState({});
  const [dragging, setDragging] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');


  const toggleTaskExpansion = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };
 
 
  const handleDragStart = (e, taskId, sourceColumn) => {
    setDragging({ taskId, sourceColumn });
    e.dataTransfer.setData('text/plain', taskId);
  };
 
  const handleDragOver = (e) => {
    e.preventDefault();
  };
 
  const handleDrop = (e, targetColumn) => {
    e.preventDefault();
    if (!dragging) return;
   
    const { taskId, sourceColumn } = dragging;
   
    if (sourceColumn === targetColumn) return;
   
    setTasks(prev => {
      const task = prev[sourceColumn].find(t => t.id === taskId);
      const sourceList = prev[sourceColumn].filter(t => t.id !== taskId);
      const targetList = [...prev[targetColumn], task];
     
      return {
        ...prev,
        [sourceColumn]: sourceList,
        [targetColumn]: targetList
      };
    });
   
    setDragging(null);
  };


  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };


  const handleMenuClose = () => {
    setAnchorEl(null);
  };


  const handleAddTaskClick = (columnId) => {
    setSelectedColumn(columnId);
    setIsAddTaskDialogOpen(true);
  };


  const handleEditTaskClick = (task, columnId) => {
    setSelectedTask(task);
    setSelectedColumn(columnId);
    setNewTaskTitle(task.title);
    setIsEditTaskDialogOpen(true);
  };


  const handleAddTaskSubmit = () => {
    if (newTaskTitle.trim()) {
      setTasks(prev => ({
        ...prev,
        [selectedColumn]: [
          ...prev[selectedColumn],
          {
            id: Date.now().toString(),
            title: newTaskTitle,
            checklist: []
          }
        ]
      }));
      setNewTaskTitle('');
      setIsAddTaskDialogOpen(false);
    }
  };


  const handleEditTaskSubmit = () => {
    if (newTaskTitle.trim()) {
      setTasks(prev => ({
        ...prev,
        [selectedColumn]: prev[selectedColumn].map(task =>
          task.id === selectedTask.id
            ? { ...task, title: newTaskTitle }
            : task
        )
      }));
      setNewTaskTitle('');
      setIsEditTaskDialogOpen(false);
    }
  };


  const handleAddChecklistItem = (taskId, columnId) => {
    if (newChecklistItem.trim()) {
      setTasks(prev => ({
        ...prev,
        [columnId]: prev[columnId].map(task =>
          task.id === taskId
            ? {
                ...task,
                checklist: [
                  ...task.checklist,
                  {
                    id: Date.now().toString(),
                    text: newChecklistItem,
                    completed: false
                  }
                ]
              }
            : task
        )
      }));
      setNewChecklistItem('');
    }
  };


  const handleToggleChecklistItem = (taskId, columnId, checklistItemId) => {
    setTasks(prev => ({
      ...prev,
      [columnId]: prev[columnId].map(task =>
        task.id === taskId
          ? {
              ...task,
              checklist: task.checklist.map(item =>
                item.id === checklistItemId
                  ? { ...item, completed: !item.completed }
                  : item
              )
            }
          : task
      )
    }));
  };
 
  const renderColumn = (columnId, columnTitle) => (
    <Box
      sx={{
        flex: 1,
        mx: 1,
        padding: 2,
        backgroundColor: 'background.paper',
        borderRadius: '4px',
        minWidth: '250px',
        boxShadow: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, columnId)}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" color="secondary">
          {columnTitle}
        </Typography>
        <IconButton
          size="small"
          color="secondary"
          onClick={() => handleAddTaskClick(columnId)}
        >
          <AddIcon />
        </IconButton>
      </Box>
     
      <Box
        sx={{
          flex: 1,
          backgroundColor: 'background.default',
          borderRadius: '4px',
          padding: 1,
          minHeight: '200px',
          position: 'relative'
        }}
      >
        {tasks[columnId].length === 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              color: 'text.secondary'
            }}
          >
            <TaskIcon sx={{ fontSize: 40, opacity: 0.5 }} />
            <Typography variant="body2" sx={{ opacity: 0.5 }}>
              No tasks in {columnTitle.toLowerCase()}
            </Typography>
          </Box>
        )}
        {tasks[columnId].map((task) => (
          <Box
            key={task.id}
            draggable
            onDragStart={(e) => handleDragStart(e, task.id, columnId)}
            sx={{
              padding: 2,
              margin: '8px 0',
              backgroundColor: 'background.paper',
              borderRadius: '4px',
              cursor: 'move',
              '&:hover': {
                backgroundColor: 'action.hover'
              },
              boxShadow: 1
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DragHandle sx={{ color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="body1" color="text.primary" sx={{ flex: 1 }}>
                {task.title}
              </Typography>
              {task.checklist.length > 0 && (
                <IconButton
                  size="small"
                  onClick={() => toggleTaskExpansion(task.id)}
                >
                  {expandedTasks[task.id] ? (
                    <ExpandLessIcon fontSize="small" />
                  ) : (
                    <ExpandMoreIcon fontSize="small" />
                  )}
                </IconButton>
              )}
              <IconButton
                size="small"
                onClick={() => handleEditTaskClick(task, columnId)}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Box>
           
            <Collapse in={expandedTasks[task.id]}>
              <Box sx={{ mt: 1 }}>
                <List dense>
                  {task.checklist.map((item) => (
                    <ListItem key={item.id} disableGutters>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Checkbox
                          edge="start"
                          checked={item.completed}
                          onChange={() => handleToggleChecklistItem(task.id, columnId, item.id)}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        sx={{
                          textDecoration: item.completed ? 'line-through' : 'none',
                          color: item.completed ? 'text.secondary' : 'text.primary'
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
                <Box sx={{ display: 'flex', mt: 1 }}>
                  <TextField
                    size="small"
                    variant="outlined"
                    placeholder="Add checklist item"
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddChecklistItem(task.id, columnId);
                      }
                    }}
                    sx={{ flex: 1, mr: 1 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleAddChecklistItem(task.id, columnId)}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Collapse>
          </Box>
        ))}
      </Box>
    </Box>
  );
 
  return (
    <Box m="20px">
      <Header title={title.toUpperCase()} subtitle="Manage Your Project Tasks" />
     
      <Box
        sx={{
          mt: 2,
          backgroundColor: 'background.paper',
          borderRadius: '4px',
          boxShadow: 2
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 2,
            p: 2,
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => handleAddTaskClick('todo')}
          >
            Add Task
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleMenuOpen}
          >
            Team Members
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            {members.map((member) => (
              <MenuItem key={member} onClick={handleMenuClose}>
                {member}
              </MenuItem>
            ))}
          </Menu>
        </Box>


        <Box sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'grid',
              gap: '20px',
              gridTemplateColumns: 'repeat(3, 1fr)'
            }}
          >
            {renderColumn('todo', 'TO DO')}
            {renderColumn('doing', 'IN PROGRESS')}
            {renderColumn('done', 'COMPLETED')}
          </Box>
        </Box>
      </Box>


      {/* Add Task Dialog */}
      <Dialog open={isAddTaskDialogOpen} onClose={() => setIsAddTaskDialogOpen(false)}>
        <DialogTitle>Add New Task</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Task Title"
            fullWidth
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddTaskDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddTaskSubmit} color="secondary">
            Add
          </Button>
        </DialogActions>
      </Dialog>


      {/* Edit Task Dialog */}
      <Dialog open={isEditTaskDialogOpen} onClose={() => setIsEditTaskDialogOpen(false)}>
        <DialogTitle>Edit Task</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Task Title"
            fullWidth
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditTaskDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditTaskSubmit} color="secondary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};


export default function App() {
  const members = ['Alice', 'Bob', 'Charlie'];
  return <Board title="Project Board" members={members} />;
}



