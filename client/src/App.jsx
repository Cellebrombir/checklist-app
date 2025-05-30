import React, { useState, useEffect } from "react";
import axios from "axios";

const defaultEventData = { name: "", eventDate: "" };
const defaultPersonData = { name: "", email: "", timeOfDay: "" };

const App = () => {
  const [events, setEvents] = useState([]);
  const [people, setPeople] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [newEvent, setNewEvent] = useState(defaultEventData);
  const [newPerson, setNewPerson] = useState(defaultPersonData);

  const [editingEventId, setEditingEventId] = useState(null);
  const [editingPersonId, setEditingPersonId] = useState(null);
  const [editPersonData, setEditPersonData] = useState(defaultPersonData);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) fetchPeople(selectedEventId);
  }, [selectedEventId]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchEvents();
      if (selectedEventId) fetchPeople(selectedEventId);
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const res = await axios.get("/api/events");
      setEvents(res.data);
      if (res.data.length > 0 && !selectedEventId) {
        setSelectedEventId(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
  };

  const fetchPeople = async (eventId) => {
    try {
      const res = await axios.get("/api/people", { params: { eventId } });
      setPeople(res.data);
    } catch (err) {
      console.error("Failed to fetch people:", err);
    }
  };

  const validateDate = (date) => /^\d{2}-\d{2}-\d{4}$/.test(date);

  const handleCreateEvent = async () => {
    const { name, eventDate } = newEvent;
    if (!name.trim() || !validateDate(eventDate.trim())) {
      alert("Kies een juiste naam en datum (dd-mm-yyyy).");
      return;
    }

    try {
      const res = await axios.post("/api/events", {
        name: name.trim(),
        eventDate: eventDate.trim(),
      });
      setEvents((prev) => [...prev, res.data]);
      setSelectedEventId(res.data.id);
      setNewEvent(defaultEventData);
    } catch (err) {
      console.error("Failed to create event:", err);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Verwijder dit event?")) return;
    try {
      await axios.delete(`/api/events/${eventId}`);
      fetchEvents();
      setSelectedEventId(null);
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  const handleAddPerson = async () => {
    const { name, email, timeOfDay } = newPerson;
    if (!name || !email || !timeOfDay || !selectedEventId) return;
    try {
      await axios.post("/api/people", {
        ...newPerson,
        checked: false,
        eventId: selectedEventId,
      });
      setNewPerson(defaultPersonData);
      fetchPeople(selectedEventId);
    } catch (err) {
      console.error("Failed to add person:", err);
    }
  };

  const handleEditPerson = async (id) => {
    try {
      await axios.put(`/api/people/${id}`, {
        ...editPersonData,
        checked: false,
        eventId: selectedEventId,
      });
      setEditingPersonId(null);
      fetchPeople(selectedEventId);
    } catch (err) {
      console.error("Failed to edit person:", err);
    }
  };

  const handleDeletePerson = async (id) => {
    if (!window.confirm("Verwijder deze person?")) return;
    try {
      await axios.delete(`/api/people/${id}`);
      fetchPeople(selectedEventId);
    } catch (err) {
      console.error("Failed to delete person:", err);
    }
  };

  const handleCheckToggle = async (index) => {
    const person = people[index];
    try {
      await axios.put(`/api/people/${person.id}`, {
        ...person,
        checked: !person.checked,
        eventId: selectedEventId,
      });
      fetchPeople(selectedEventId);
    } catch (err) {
      console.error("Failed to toggle checked:", err);
    }
  };

  const exportToCSV = () => {
    const event = events.find((e) => e.id === selectedEventId);
    if (!event) return;

    const csvRows = ["Naam,Email,Dagdeel,Aanwezig"];
    people.forEach(({ name, email, timeOfDay, checked }) =>
      csvRows.push(`${name},${email},${timeOfDay},${checked}`)
    );

    const dateStr = validateDate(event.eventDate)
      ? event.eventDate
      : new Date().toLocaleDateString("nl-NL").replace(/\//g, "-");

    const filename = `${event.name.replace(/[^a-z0-9]/gi, "_")}_${dateStr}.csv`;
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedEventId) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const lines = event.target.result.trim().split("\n").filter(Boolean);
      const [, ...rows] = lines;

      const people = rows.map((line) => {
        const [name, email, timeOfDay, checked] = line.split(";").map((c) => c.trim());
        return { name, email, timeOfDay, checked: checked.toLowerCase() === "true" };
      });

      try {
        await axios.post("/api/people/import", { people, eventId: selectedEventId });
        fetchPeople(selectedEventId);
      } catch (err) {
        console.error("Import failed:", err);
      }
    };
    reader.readAsText(file);
  };

  const toggleAdmin = () => {
    if (!isAdmin) {
      const pwd = prompt("Voer admin wachtwoord in:");
      if (pwd === "admin") setIsAdmin(true);
      else alert("Onjuist wachtwoord.");
    } else {
      setIsAdmin(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Admin & Event Selector */}
      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isAdmin} onChange={toggleAdmin} />
          Admin modus
        </label>

        <select
          value={selectedEventId || ""}
          onChange={(e) => setSelectedEventId(Number(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1"
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {editingEventId === event.id ? "✏️ Bewerken..." : `${event.name} (${event.eventDate || ""})`}
            </option>
          ))}
        </select>

        {isAdmin && (
          <>
            <input
              type="text"
              placeholder="Nieuwe event naam"
              value={newEvent.name}
              onChange={(e) => setNewEvent((ev) => ({ ...ev, name: e.target.value }))}
              className="border p-2 rounded w-48"
            />
            <input
              type="text"
              placeholder="Datum (dd-mm-jjjj)"
              value={newEvent.eventDate}
              onChange={(e) => setNewEvent((ev) => ({ ...ev, eventDate: e.target.value }))}
              className="border p-2 rounded w-36"
            />
            <button onClick={handleCreateEvent} className="bg-green-600 text-white px-4 py-2 rounded">
              Maak event aan
            </button>
          </>
        )}
      </div>

      {isAdmin && (
        <>
          <div className="flex gap-2">
            <button className="bg-green-600 text-white w-full p-2 rounded" onClick={exportToCSV}>
              Exporteren naar CSV
            </button>
            <label className="bg-gray-200 p-2 rounded cursor-pointer text-center w-full">
              Importeren uit CSV
              <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
            </label>
          </div>
          <div className="flex">
            <button
              className="bg-purple-600 text-white w-full p-2 rounded"
              onClick={() => handleDeleteEvent(selectedEventId)}
            >
              Verwijder huidig event
            </button>
          </div>
        </>
      )}

      {/* Add Person */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            className="border p-2 rounded w-full"
            placeholder="Naam"
            value={newPerson.name}
            onChange={(e) => setNewPerson((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            className="border p-2 rounded w-full"
            placeholder="Email"
            value={newPerson.email}
            onChange={(e) => setNewPerson((p) => ({ ...p, email: e.target.value }))}
          />
          <select
            value={newPerson.timeOfDay}
            onChange={(e) => setNewPerson((p) => ({ ...p, timeOfDay: e.target.value }))}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value="" disabled>Kies een dagdeel</option>
            <option value="Ochtend">Ochtend</option>
            <option value="Middag">Middag</option>
            <option value="Hele dag">Hele dag</option>
          </select>
          <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleAddPerson}>
            Voeg toe
          </button>
        </div>

        {/* People List */}
        <ul className="space-y-2">
          {people.map((person) => (
            <li key={person.id} className="flex justify-between items-center border p-2 rounded shadow-sm">
              {editingPersonId === person.id ? (
                <div className="flex gap-2 w-full">
                  <input
                    value={editPersonData.name}
                    onChange={(e) => setEditPersonData((p) => ({ ...p, name: e.target.value }))}
                    className="border p-1 rounded w-full"
                  />
                  <input
                    value={editPersonData.email}
                    onChange={(e) => setEditPersonData((p) => ({ ...p, email: e.target.value }))}
                    className="border p-1 rounded w-full"
                  />
                  <select
                    value={editPersonData.timeOfDay}
                    onChange={(e) => setEditPersonData((p) => ({ ...p, timeOfDay: e.target.value }))}
                    className="border p-1 rounded"
                  >
                    <option value="Ochtend">Ochtend</option>
                    <option value="Middag">Middag</option>
                    <option value="Hele dag">Hele dag</option>
                  </select>
                  <button
                    onClick={() => handleEditPerson(person.id)}
                    className="bg-green-600 text-white px-2 rounded"
                  >
                    Opslaan
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <p className="font-semibold">{person.name}</p>
                    <p className="text-sm">{person.email}</p>
                    <p className="text-sm">{person.timeOfDay}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={person.checked}
                      onChange={() => handleCheckToggle(people.indexOf(person))}
                    />
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => {
                            setEditingPersonId(person.id);
                            setEditPersonData({
                              name: person.name,
                              email: person.email,
                              timeOfDay: person.timeOfDay,
                            });
                          }}
                          className="text-yellow-600 text-sm"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeletePerson(person.id)}
                          className="text-red-600 text-sm"
                        >
                          ❌
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;
