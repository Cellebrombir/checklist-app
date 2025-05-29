import React, { useState, useEffect } from "react";
import axios from "axios";

const App = () => {
  const [people, setPeople] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");

  // Load people from backend DB
  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    try {
      const res = await axios.get("/api/people");
      setPeople(res.data);
    } catch (err) {
      console.error("Failed to fetch people:", err);
    }
  };

  // Add a new person via backend
  const handleAddPerson = async () => {
    if (!name || !email || !timeOfDay) return;
    try {
      await axios.post("/api/people", {
        name,
        email,
        timeOfDay,
        checked: false,
      });
      setName("");
      setEmail("");
      setTimeOfDay("");
      fetchPeople();
    } catch (err) {
      console.error("Failed to add person:", err);
    }
  };

  // Toggle checked status via backend update
  const handleCheckToggle = async (index) => {
    const person = people[index];
    try {
      await axios.put(`/api/people/${person.id}`, {
        ...person,
        checked: !person.checked,
      });
      fetchPeople();
    } catch (err) {
      console.error("Failed to toggle checked:", err);
    }
  };



  // Export current people to CSV (same as before)
  const exportToCSV = () => {
    const csvRows = ["Naam,Email,Dagdeel,Aanwezig"];
    people.forEach(({ name, email, timeOfDay, checked }) => {
      csvRows.push(`${name},${email},${timeOfDay},${checked}`);
    });
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "checklist.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import CSV, replace entire list in backend
  const handleImportCSV = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    const text = event.target.result;
    const lines = text.trim().split("\n");
    const [header, ...rows] = lines;
    const importedPeople = rows.map(line => {
      const [name, email, timeOfDay, checked] = line.split(";");
      return { 
        name: name.trim(), 
        email: email.trim(), 
        timeOfDay: timeOfDay.trim(), 
        checked: checked.trim().toLowerCase() === "true" 
      };
    });

    try {
      // Send importedPeople array to backend API that bulk inserts
      await axios.post("/api/people/import", { people: importedPeople });
      fetchPeople(); // refresh list after import
    } catch (error) {
      console.error("Import failed:", error);
    }
  };
  reader.readAsText(file);
};


  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            className="border p-2 rounded w-full"
            placeholder="Naam"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="border p-2 rounded w-full"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value="" disabled>
              Kies een dagdeel
            </option>
            <option value="Ochtend">Ochtend</option>
            <option value="Middag">Middag</option>
            <option value="Hele dag">Hele dag</option>
          </select>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={handleAddPerson}
          >
            Voeg toe
          </button>
        </div>
        <ul className="space-y-2">
          {people.map((person, index) => (
            <li
              key={person.id || index}
              className="flex items-center justify-between border p-2 rounded-lg shadow-sm"
            >
              <div>
                <p className="font-semibold">{person.name}</p>
                <p className="text-sm text-gray-600">{person.email}</p>
                <p className="text-sm text-gray-600">{person.timeOfDay}</p>
              </div>
              <input
                type="checkbox"
                checked={person.checked}
                onChange={() => handleCheckToggle(index)}
              />
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <button
            className="bg-green-600 text-white w-full p-2 rounded"
            onClick={exportToCSV}
          >
            Exporteren naar CSV
          </button>
          <label className="bg-gray-200 p-2 rounded cursor-pointer text-center w-full">
            Importeren uit CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default App;
