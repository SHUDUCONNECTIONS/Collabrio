import { useState, useEffect } from "react";

const HistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ user: "", dateRange: "" });
  const [filteredHistory, setFilteredHistory] = useState([]);

  // Mock data fetching
  useEffect(() => {
    // Replace with your API call to fetch history data
    const fetchHistory = async () => {
      const mockData = [
        {
          id: 1,
          user: "John Doe",
          action: "Moved Task X from 'To Do' to 'In Progress'",
          timestamp: "2025-01-16 10:30",
          taskId: "123",
        },
        {
          id: 2,
          user: "Jane Smith",
          action: "Added a comment to Task Y",
          timestamp: "2025-01-16 11:00",
          taskId: "124",
        },
        // Add more entries
      ];
      setHistory(mockData);
      setFilteredHistory(mockData); // Initialize filtered data
    };

    fetchHistory();
  }, []);

  // Filter logic
  useEffect(() => {
    const filtered = history.filter((entry) => {
      const matchesUser = filters.user ? entry.user.includes(filters.user) : true;
      const matchesSearch = entry.action.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesUser && matchesSearch;
    });

    setFilteredHistory(filtered);
  }, [history, searchTerm, filters]);

  return (
    <div>
      <h1>History Page</h1>
      <div className="filters">
        <input
          type="text"
          placeholder="Search by action..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={filters.user}
          onChange={(e) => setFilters({ ...filters, user: e.target.value })}
        >
          <option value="">Filter by User</option>
          <option value="John Doe">John Doe</option>
          <option value="Jane Smith">Jane Smith</option>
          {/* Dynamically populate options */}
        </select>
      </div>
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Action</th>
            <th>Timestamp</th>
            <th>Task</th>
          </tr>
        </thead>
        <tbody>
          {filteredHistory.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.user}</td>
              <td>{entry.action}</td>
              <td>{entry.timestamp}</td>
              <td>
                <a href={`/tasks/${entry.taskId}`}>View Task</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HistoryPage;
