import React, { useState, useEffect, useRef, useContext } from 'react';
import { Button, Form, Container, Row, Col, InputGroup, FormControl, Spinner, Table, DropdownButton, Dropdown } from 'react-bootstrap';
import TopbarNav from '../TopbarNav/TopbarNav';
import BreadcrumbAndProfile from '../BreadcrumbAndProfile/BreadcrumbAndProfile';
import * as XLSX from 'xlsx'; // Import for exporting data to Excel
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faCamera, faImage, faUpload } from "@fortawesome/free-solid-svg-icons"; // Icons for buttons
import { motion } from 'framer-motion'; // Animation library
import InfoCard from "../InfoCard/InfoCard"; // Component for displaying info cards
import { UserContext } from "../Auth/UserContext"; // Import UserContext for user-specific data

function Expenses() {
  // State declarations for managing expenses and other UI elements
  const [expenses, setExpenses] = useState([]);
  const [monthlySavings, setMonthlySavings] = useState(0); // Track monthly savings
  const [monthlyExpense, setMonthlyExpense] = useState(0); // Track monthly expenses
  const [searchQuery, setSearchQuery] = useState(""); // Search query for filtering expenses
  const [expense, setExpense] = useState({ // Form state for adding/editing an expense
    name: '',
    amount: '',
    date: '',
    description: '',
    category: ''
  });
  const [successMessage, setSuccessMessage] = useState(null); // Display success message
  const [totalSavings, setTotalSavings] = useState(0); // Track total savings
  const [timeRange, setTimeRange] = useState('7 Days'); // Set default time range for filtering expenses
  const [editing, setEditing] = useState(false); // Track if currently editing an expense
  const [currentExpense, setCurrentExpense] = useState(null); // Track the expense being edited
  const [addOption, setAddOption] = useState(null); // Option selected for adding an expense (manual, camera, picture)
  const [dateOption, setDateOption] = useState("today"); // Date option (today, yesterday, custom)
  const [file, setFile] = useState(null); // Track the uploaded file
  const [isLoading, setIsLoading] = useState(false); // For loading indicator during data fetches
  const [errorMessage, setErrorMessage] = useState(null); // For error handling

  // List of predefined categories for expenses
  const categories = ["Utility", "Rent", "Groceries", "Entertainment", "Other"];

  // Refs for video (camera) and canvas (captured image)
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Fetch user context data using useContext hook
  const user = useContext(UserContext);

  // Effect to fetch monthly savings and expenses data when the component mounts
  useEffect(() => {
    const fetchExpenseAndSavingsData = async () => {
      try {
        // Fetch data for the last 6 months of savings and expenses
        const expenseResponse = await fetch(`/api/monthly-savings-last6months?userid=${user.uid}`);
        const expenseData = await expenseResponse.json();
        console.log("Expense data for the last 6 months: ", expenseData);

        // Sort months in ascending order and extract the latest month
        const sortedMonths = Object.keys(expenseData).sort();
        const latestMonth = sortedMonths.pop();
        console.log("Latest month: ", latestMonth);

        const latestMonthData = expenseData[latestMonth];
        setMonthlyExpense(latestMonthData.expenses); // Set monthly expense
        setMonthlySavings(latestMonthData.income - latestMonthData.expenses); // Calculate monthly savings

        // Fetch total financial summary (total income and expenses)
        const summaryResponse = await fetch(`/api/financial_summary?userid=${user.uid}`);
        const summaryData = await summaryResponse.json();
        console.log("Financial summary data: ", summaryData);
        setTotalSavings(summaryData.total_income - summaryData.total_expenses); // Set total savings

        // Prepare data for the expense table from sorted months
        const expensesForTable = sortedMonths.reduce((acc, month) => {
          const monthData = expenseData[month];
          acc.push({
            date: month,
            amount: monthData.expenses,
            category: "Monthly Expenses",
            description: `Expenses for ${month}`
          });
          return acc;
        }, []);
        setExpenses(expensesForTable); // Update state with table data

      } catch (error) {
        console.error("Error fetching expenses or savings data:", error); // Log any error encountered
      }
    };

    fetchExpenseAndSavingsData(); // Call the async function on component mount
  }, [user.uid]);

  // Effect to fetch expenses based on the selected time range (24 hours, 7 days, 30 days)
  useEffect(() => {
    const fetchExpenses = async () => {
      setIsLoading(true); // Start loading
      setErrorMessage(null); // Reset error message

      try {
        let endpoint;
        switch (timeRange) {
          case "24 Hours":
            endpoint = `/api/expense/last24hours?userid=${user.uid}`;
            break;
          case "7 Days":
            endpoint = `/api/expense/last7days?userid=${user.uid}`;
            break;
          default:
            endpoint = `/api/expense/last30days?userid=${user.uid}`;
        }

        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error('Failed to fetch expenses');
        }
        const data = await response.json();
        setExpenses(data.expenses); // Update state with fetched expenses
      } catch (err) {
        setErrorMessage(err.message); // Display error message
      } finally {
        setIsLoading(false); // End loading
      }
    };

    fetchExpenses(); // Fetch expenses on timeRange or user.uid change
  }, [timeRange, user.uid]);

  // Helper function to parse amount as a number
  const parseAmount = (amount) => parseFloat(amount) || 0;

  // Helper function to format date as a readable string
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Export expenses to Excel file
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(expenses); // Convert expenses to worksheet
    const wb = XLSX.utils.book_new(); // Create a new workbook
    XLSX.utils.book_append_sheet(wb, ws, "Expenses"); // Append the worksheet
    XLSX.writeFile(wb, "Expenses.xlsx"); // Trigger download as Excel file
  };

  // Handle selection of adding expense options (manual, camera, etc.)
  const handleOptionClick = (option) => {
    setAddOption(option);
    if (option === "camera") {
      startCamera(); // If camera option selected, start camera
    }
  };

  // Handle editing an existing expense
  const handleEdit = (expense) => {
    setEditing(true); // Set editing mode
    setCurrentExpense(expense); // Set the current expense being edited
    setExpense(expense); // Populate the form with expense data
    setDateOption("custom"); // Set date option to custom
    setAddOption("manual"); // Open manual form for editing
  };

  // Reset form fields and exit editing mode
  const resetForm = () => {
    setExpense({
      name: "",
      amount: "",
      date: "",
      description: "",
      isPaid: false,
      category: "",
    });
    setEditing(false); // Exit editing mode
    setCurrentExpense(null); // Clear current expense
    setDateOption("today"); // Reset date option to today
    setAddOption(null); // Reset add option
  };

  // Handle form input changes for adding/editing expense
  const handleChange = (e) => {
    const { name, value } = e.target;
    setExpense(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle date change based on selected option (today, yesterday, custom)
  const handleDateChange = (option) => {
    setDateOption(option);
    if (option === "today") {
      setExpense((prev) => ({
        ...prev,
        date: new Date().toISOString().split("T")[0], // Set today's date
      }));
    } else if (option === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1); // Set yesterday's date
      setExpense((prev) => ({
        ...prev,
        date: yesterday.toISOString().split("T")[0],
      }));
    } else {
      setExpense((prev) => ({ ...prev, date: "" })); // Custom date requires user input
    }
  };

  // Handle form submission to add or update an expense
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!expense.name || !expense.amount || !expense.date) {
      alert("All fields are required, including the category.");
      return;
    }

    const newExpense = {
      ...expense,
      amount: parseFloat(expense.amount),
      id: editing ? currentExpense.id : Date.now() // If editing, preserve the same ID
    };

    setMonthlyExpense(monthlyExpense + newExpense.amount); // Update monthly expense

    if (editing) {
      // Update existing expense
      setExpenses(
        expenses.map((exp) => (exp.id === currentExpense.id ? newExpense : exp))
      );
    } else {
      // Add new expense
      setExpenses([...expenses, newExpense]);
    }

    resetForm(); // Reset form after submission
  };

  // Handle removal of an expense by ID
  const handleRemove = (id) => {
    const isConfirmed = window.confirm("Are you sure you want to remove this expense?");
    if (isConfirmed) {
      setExpenses(expenses.filter((exp) => exp.id !== id)); // Remove the selected expense
    }
  };

  // Handle file change when uploading an image for expense
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile); // Update the selected file state
    console.log('File selected:', selectedFile); // Debugging: Log selected file
  };

  // Handle file submission (upload image file to server)
  const handleFileSubmit = () => {
    if (!file) {
      alert('Please select a file before submitting.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file); // Append the file to FormData object

    setIsLoading(true); // Show loading spinner
    setErrorMessage(null); // Reset error message
    setSuccessMessage(null); // Reset success message

    fetch('/api/upload', {
      method: 'POST',
      body: formData, // Send the file via POST request
    })
      .then(response => response.json())
      .then(data => {
        setIsLoading(false); // Stop loading spinner
        if (data.error) {
          setErrorMessage(data.error); // Show error message if API returns error
        } else {
          console.log('File successfully submitted. Extracted data:', data);

          // Parse date, fallback to today if invalid
          let parsedDate = new Date(data.date);
          if (isNaN(parsedDate.getTime())) {
            console.warn('Invalid date, using today\'s date as fallback.');
            parsedDate = new Date();
          }

          // Create new expense object from extracted data
          const newExpense = {
            id: Date.now(),
            name: data.name || 'Unnamed Expense',
            amount: parseFloat(data.amount) || 0,
            date: parsedDate.toISOString().split('T')[0],
            description: data.description || '',
            category: data.category || 'Uncategorized',
          };

          console.log('New expense object:', newExpense);

          setExpenses(prevExpenses => {
            const updatedExpenses = [newExpense, ...prevExpenses];
            console.log('Updated expenses:', updatedExpenses); // Log updated expenses
            return updatedExpenses;
          });

          setSuccessMessage("Expense added successfully!"); // Show success message
          setFile(null); // Reset file input
        }
      })
      .catch(error => {
        setIsLoading(false); // Stop loading spinner
        setErrorMessage('Error during file submission: ' + error.message); // Show error message
      });
  };

  // Start the camera to capture images
  const startCamera = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true }) // Request video stream
      .then((stream) => {
        videoRef.current.srcObject = stream; // Set stream as the video source
        videoRef.current.play(); // Start video playback
      })
      .catch((err) => {
        setErrorMessage("Error accessing the camera: " + err.message); // Show error message
      });
  };

  // Capture an image from the camera
  const captureImage = () => {
    const context = canvasRef.current.getContext("2d");
    context.drawImage(
      videoRef.current,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    // Convert canvas to image file and set it as the selected file
    canvasRef.current.toBlob((blob) => {
      const capturedImageFile = new File([blob], "captured_image.jpg", {
        type: "image/jpeg",
      });
      setFile(capturedImageFile); // Set the captured image as the file
    }, "image/jpeg");
  };

  // Calculate the total expense amount
  const totalExpense = expenses.reduce(
    (total, exp) => total + parseFloat(exp.amount),
    0
  );

  // Data structure for chart (visualization) based on expenses
  const chartData = {
    labels: expenses.map((exp) => new Date(exp.date)), // Use dates as chart labels
    datasets: [
      {
        label: "Total Expenses",
        data: expenses.map((exp) => exp.amount),
        fill: false,
        backgroundColor: "rgba(75,192,192,0.2)", // Chart color
        borderColor: "rgba(75,192,192,1)", // Chart border color
        borderWidth: 2,
      },
    ],
  };

  // Chart configuration options
  const chartOptions = {
    scales: {
      x: {
        type: "time",
        time: {
          unit: "day",
        },
        title: {
          display: true,
          text: "Date",
        },
      },
      y: {
        title: {
          display: true,
          text: "Expenses (CHF)",
        },
      },
    },
  };

  // Get filtered expenses based on the time range (last 24 hours, last 7 days, etc.)
  const getFilteredExpenses = () => {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (timeRange === '24 Hours' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000));

    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= cutoffDate && expenseDate <= now;
    });
  };

  const filteredExpenses = getFilteredExpenses(); // Get the filtered expenses

  return (
    <Container fluid>
      <Row className="topbar">
        <TopbarNav username="Nerit Küneşko" role="Entrepreneur" />
      </Row>
      <Row>
        <Col md={10} className="main">
          <BreadcrumbAndProfile
            username="Nerit Küneşko"
            role="Entrepreneur"
            pageTitle="Expenses"
            breadcrumbItems={[
              { name: "Dashboard", path: "/dashboard", active: false },
              { name: "Expenses", path: "/expenses", active: true },
            ]}
          />

          {/* Display Monthly Expense and Monthly Savings */}
          <Row className="mb-4">
            <Col md={6}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <InfoCard
                  title="Monthly Expense"
                  value={`CHF ${monthlyExpense.toFixed(2)}`}
                />
              </motion.div>
            </Col>
            <Col md={6}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <InfoCard
                  title="Monthly Savings"
                  value={`CHF ${monthlySavings.toFixed(2)}`}
                />
              </motion.div>
            </Col>
          </Row>

          {/* Buttons for different add expense options */}
          <div className="d-flex justify-content-between mt-4 mb-3 button-group">
            <Button
              variant="secondary"
              className="mt-3 primary-button"
              onClick={() => handleOptionClick("google-wallet")}
            >
              Add through Google Wallet
              <FontAwesomeIcon icon={faPlusCircle} className="icon-right" />
            </Button>

            <Button
              variant="secondary"
              className="mt-3 primary-button"
              onClick={() => handleOptionClick("camera")}
            >
              Add through Camera
              <FontAwesomeIcon icon={faCamera} className="icon-right" />
            </Button>

            <Button
              variant="secondary"
              className="mt-3 primary-button"
              onClick={() => handleOptionClick("picture")}
            >
              Add through Picture
              <FontAwesomeIcon icon={faImage} className="icon-right" />
            </Button>

            <Button
              variant="primary"
              className="mt-3 primary-button"
              onClick={() => handleOptionClick("manual")}
            >
              Add Manually
              <FontAwesomeIcon icon={faPlusCircle} className="icon-right" />
            </Button>
          </div>

          {/* Conditional rendering based on the selected option */}
          {addOption === "manual" && (
            <Form onSubmit={handleSubmit}>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Control
                      type="text"
                      placeholder="Expense Name"
                      name="name"
                      value={expense.name}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Control
                      type="number"
                      placeholder="Amount (CHF)"
                      name="amount"
                      value={expense.amount}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Select Date</Form.Label>
                <div className="d-flex gap-2">
                  <Button
                    variant={dateOption === 'today' ? 'primary' : 'secondary'}
                    onClick={() => handleDateChange('today')}
                    className="flex-grow-1"
                  >
                    Today
                  </Button>
                  <Button
                    variant={dateOption === 'yesterday' ? 'primary' : 'secondary'}
                    onClick={() => handleDateChange('yesterday')}
                    className="flex-grow-1"
                  >
                    Yesterday
                  </Button>
                  <Button
                    variant={dateOption === 'custom' ? 'primary' : 'secondary'}
                    onClick={() => handleDateChange('custom')}
                    className="flex-grow-1"
                  >
                    Custom
                  </Button>
                </div>
              </Form.Group>

              {dateOption === 'custom' && (
                <Form.Group className="mb-3">
                  <Form.Control
                    type="date"
                    name="date"
                    value={expense.date}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              )}

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder="Description (optional)"
                      name="description"
                      value={expense.description}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Control
                      as="select"
                      name="category"
                      value={expense.category}
                      onChange={handleChange}
                    >
                      <option value="">Select Category (optional)</option>
                      {categories.map((category, index) => (
                        <option key={index} value={category}>{category}</option>
                      ))}
                    </Form.Control>
                  </Form.Group>
                </Col>
              </Row>

              <Button variant="primary" type="submit" className="mt-3 primary-button">
                {editing ? "Update Expense" : "Add Expense"}
                <FontAwesomeIcon icon={faPlusCircle} className="icon-right" />
              </Button>
            </Form>
          )}

          {addOption === 'picture' && (
            <div className="mt-3">
              <Form.Group controlId="formFile" className="mb-3">
                <Form.Label>Choose an image of your expense</Form.Label>
                <div className="custom-file-input">
                  <Form.Control
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="d-none"
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() => document.getElementById('formFile').click()}
                    className="w-100 text-left d-flex justify-content-between align-items-center"
                  >
                    <span>{file ? file.name : 'Browse...'}</span>
                    <FontAwesomeIcon icon={faUpload} />
                  </Button>
                </div>
              </Form.Group>
              <Button onClick={handleFileSubmit} className="mt-3 primary-button">
                Submit Picture
                <FontAwesomeIcon icon={faUpload} className="icon-right" />
              </Button>
            </div>
          )}

          {addOption === "camera" && (
            <div>
              <video ref={videoRef} style={{ width: "100%" }} />
              <canvas
                ref={canvasRef}
                style={{ display: "none" }}
                width="640"
                height="480"
              />
              <Button onClick={captureImage} className="mt-3 primary-button">
                Capture and Submit Picture
              </Button>
            </div>
          )}

          {/* Show loading spinner or error message */}
          {isLoading && (
            <div className="text-center mt-3">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="mt-2">Submitting...</p>
            </div>
          )}
          {successMessage && <div className="text-success mt-3">{successMessage}</div>}
          {errorMessage && <div className="text-danger mt-3">{errorMessage}</div>}

          {/* Table to display the expenses */}
          <Row className="mb-5 mt-4">
            <Col md={12} className="expense-tracker">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="expense-tracker-title">Expense Tracker</h2>
                <DropdownButton
                  id="dropdown-time-range"
                  title={`Showing: Last ${timeRange}`}
                  variant="secondary"
                  onSelect={(e) => setTimeRange(e)}
                >
                  <Dropdown.Item eventKey="24 Hours">Last 24 Hours</Dropdown.Item>
                  <Dropdown.Item eventKey="7 Days">Last 7 Days</Dropdown.Item>
                </DropdownButton>
              </div>

              <Table striped bordered hover className="styled-expense-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense, index) => (
                    <tr key={expense.id || index}>
                      <td>{formatDate(expense.date)}</td>
                      <td>{expense.name}</td>
                      <td>{expense.category}</td>
                      <td>{expense.description}</td>
                      <td>CHF {parseFloat(expense.amount).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center">
                      No expenses found for the selected time range.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
}

export default Expenses;
